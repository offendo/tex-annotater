#!/usr/bin/env python3
import uuid
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS, cross_origin
from pathlib import Path

import time
import base64
import re
import os
import sqlite3
import boto3
import json

from apscheduler.schedulers.background import BackgroundScheduler
from transformers import AutoTokenizer
from .search import fuzzysearch
from .data import (
    export_annotations,
    load_tex,
    list_all_textbooks,
    load_all_annotations,
    load_pdf,
    load_save_files,
    load_annotations,
    mark_save_as_final,
    save_annotations,
    get_savename_from_annoid,
    list_s3_documents,
    init_annotation_db,
    upload_new_textbooks,
)
from .users import (
    add_user,
    authenticate_user,
    init_users_db,
)

from .search import fuzzysearch, download_and_index_tex, compute_fold_mapping

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

init_annotation_db()
init_users_db()

sched = BackgroundScheduler(daemon=True)
sched.add_job(upload_new_textbooks, "interval", minutes=10)
sched.start()


@app.post("/annotations")
@cross_origin()
def post_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    autosave = request.args.get("autosave")
    savename = request.args.get("savename")
    autosave = 1 if autosave == "true" else 0
    annotations = request.get_json()["annotations"]
    save_info = save_annotations(fileid, userid, annotations, autosave=autosave, savename=savename)
    return save_info, 200


@app.get("/export")
@cross_origin()
def export_save():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    tokenizer_id = request.args.get("tokenizer", "EleutherAI/llemma_7b")
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_id)
    anno_json = export_annotations(file_id=fileid, user_id=userid, timestamp=timestamp, tokenizer=tokenizer)
    out_file = f"/tmp/{fileid}-{userid}-{timestamp}.json"
    with open(out_file, "w") as f:
        json.dump(anno_json, f)
    return send_file(out_file, as_attachment=True, download_name=out_file.split("/")[-1])


@app.get("/annotations/all")
@cross_origin()
def get_all_annotations():
    fileid = request.args.get("fileid")
    if fileid is None:
        return "Bad request: need fileid!", 400
    annotations = load_all_annotations(fileid)

    return {"otherAnnotations": annotations}, 200


@app.get("/annotations")
@cross_origin()
def get_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    savename = request.args.get("savename")
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    annotations = load_annotations(fileid, userid, timestamp if len(timestamp) else None)

    return {
        "fileid": fileid,
        "annotations": annotations,
        "timestamp": timestamp,
        "savename": savename,
    }, 200


@app.post("/finalize")
@cross_origin()
def finalize_save():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    savename = request.args.get("savename")
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    finalized = mark_save_as_final(fileid, userid, savename, timestamp)

    return {"finalized": finalized}, 200


@app.get("/saves")
@cross_origin()
def list_all_saves():
    fileid = request.args.get("fileid")
    userid = request.args.get("userid")
    return {"saves": load_save_files(file_id=fileid, user_id=userid)}


@app.get("/documents")
@cross_origin()
def list_all_documents():
    return {"documents": list_s3_documents()}


@app.get("/tex")
@cross_origin()
def get_tex():
    fileid = request.args.get("fileid")
    if fileid is None:
        return 400, "Request requires fileid"
    tex = load_tex(fileid)

    return {
        "fileid": fileid,
        "tex": tex,
    }


@app.get("/savename")
@cross_origin()
def get_savename():
    annoid = request.args.get("annoid")
    if annoid is None:
        return "Bad request: need annoid!", 400
    result = get_savename_from_annoid(annoid)

    return {
        "fileid": result["fileid"],
        "userid": result["userid"],
        "savename": result["savename"],
        "timestamp": result["timestamp"],
    }, 200


@app.get("/pdf")
@cross_origin()
def get_pdf():
    fileid = request.args.get("fileid")
    if fileid is None:
        return 400, "Request requires fileid"
    arxiv_id = fileid.split("-")[0].replace("texs/", "")
    if re.match(r"\d+\.\d+", arxiv_id):
        pdf = f"https://arxiv.org/pdf/{arxiv_id}"
    else:
        pdf = load_pdf(fileid.replace(".tex", ".pdf"))
    return {
        "fileid": fileid,
        "pdf": pdf,
    }


@app.post("/authenticate")
@cross_origin()
def login_user():
    body = request.get_json()
    userid = body["userid"]
    passwd = body["password"]
    authenticated = authenticate_user(userid, passwd)
    if authenticated:
        token = uuid.uuid4()
    else:
        token = ""
    return {"authenticated": authenticated, "token": token, "userid": userid}, 200


@app.post("/user")
@cross_origin()
def add_new_user():
    body = request.get_json()
    userid = body["userid"]
    passwd = body["password"]
    success = add_user(userid, passwd)
    if not success:
        return {"error": "Error: user already exists!"}, 400
    return {"token": uuid.uuid4(), "userid": userid}, 200


@app.get("/definition")
@cross_origin()
def search_for_definition():
    query = request.args.get("query")
    fileid = request.args.get("fileid", "")  # default to empty string
    topk = int(request.args.get("topk", 20))
    width = int(request.args.get("width", -1))
    extraPatterns = json.loads(request.args.get("extraPatterns", "[]"))
    if query is None or width == -1:
        return jsonify({"error": "Error: query and width are required"}), 400

    # Get the index
    index = download_and_index_tex("/tmp/textbooks", extraPatterns)

    # Do the fuzzysearch
    results = fuzzysearch(query, index, topk=topk, fileid=fileid)

    # Remap the line numbers to the post-folding line numbers
    new_results = []
    for match in results:
        old2new, lines = compute_fold_mapping(match["file"], width)
        match["line"] = old2new.get(match["line"], match["line"])
        match["percent"] = int(match["line"]) / int(lines)
        match["file"] = str(Path(match["file"]).name)
        new_results.append(match)

    return jsonify({"results": new_results}), 200
