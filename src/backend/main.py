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

from .scoring import (
    compute_annotation_diff,
    compute_score_and_diff,
)
from .search import fuzzysearch
from .data import (
    export_annotations,
    insert_predictions,
    load_dashboard_data,
    load_save_info_from_timestamp,
    load_all_annotations,
    load_saves,
    load_annotations,
    insert_annotations,
    load_anno_from_annoid,
    init_annotation_db,
    finalize_save,
    delete_save,
)
from .data_utils import (
    load_tex,
    load_pdf,
    list_s3_documents,
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


@app.get("/annotations/export")
@cross_origin()
def get_export_save():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    savename = request.args.get("savename")
    ignore = request.args.get("ignore_annotation_endpoints")
    tokenizer_id = request.args.get("tokenizer", "EleutherAI/llemma_7b")
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_id)
    anno_json = export_annotations(
        fileid=fileid, userid=userid, timestamp=timestamp, tokenizer=tokenizer, ignore_annotation_endpoints=ignore
    )
    out_file = f"/tmp/{fileid}-{userid}-{savename}-{tokenizer_id.replace('/', '_')}.json"
    with open(out_file, "w") as f:
        json.dump(anno_json, f)
    return send_file(out_file, as_attachment=True, download_name=out_file.split("/")[-1])


@app.get("/annotations/score")
@cross_origin()
def get_score_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")

    ref_userid = request.args.get("ref_userid")
    ref_fileid = request.args.get("ref_fileid")
    ref_timestamp = request.args.get("ref_timestamp")

    tokenizer_id = request.args.get("tokenizer", "EleutherAI/llemma_7b")
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_id)

    tags = request.args.get("tags", "").split(";")

    sys_json = export_annotations(fileid=fileid, userid=userid, timestamp=timestamp, tokenizer=tokenizer)
    begin = sys_json["begin"]
    end = sys_json["end"]
    ref_json = export_annotations(
        fileid=ref_fileid, userid=ref_userid, timestamp=ref_timestamp, tokenizer=tokenizer, begin=begin, end=end
    )
    scores = compute_score_and_diff(sys_json, ref_json, tags)
    return scores, 200


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
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    annotations = load_annotations(fileid, userid, timestamp if len(timestamp) else None)
    save_info = load_save_info_from_timestamp(timestamp)

    return {
        "fileid": fileid,
        "userid": save_info["userid"],
        "annotations": annotations,
        "timestamp": timestamp,
        "savename": save_info["savename"],
    }, 200


@app.post("/annotations")
@cross_origin()
def post_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    autosave = request.args.get("autosave")
    savename = request.args.get("savename")
    autosave = 1 if autosave == "true" else 0
    annotations = request.get_json()["annotations"]
    if not fileid:
        return {"error": "missing fileid"}, 400
    if not userid:
        return {"error": "missing userid"}, 400
    save_info = insert_annotations(fileid, userid, annotations, autosave=autosave, savename=savename)
    return save_info, 200


@app.post("/predictions")
@cross_origin()
def post_predictions():
    fileid = request.args.get("fileid")
    savename = request.args.get("savename")
    annotations = request.get_json()["annotations"]
    if not fileid:
        return {"error": "missing fileid"}, 400
    save_info = insert_predictions(fileid, annotations, savename=savename)
    return save_info, 200


@app.get("/annotations/diff")
@cross_origin()
def get_annotations_diff():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamps = request.args.get("timestamps").split(";")
    tags = request.args.get("tags").split(";")
    if userid is None or fileid is None or timestamps is None:
        return "Bad request: need userid, fileid, and timestamp!", 400

    annos = []
    result = []
    begin = 999999999999
    end = -1
    for timestamp in timestamps:
        save_info = load_save_info_from_timestamp(timestamp)
        anno = load_annotations(fileid, save_info["userid"], timestamp, add_timestamp_to_ids=True)
        for a in anno:
            if a["start"] < begin:
                begin = a["start"]
            if a["end"] > end:
                end = a["end"]
        annos.append(anno)
        result.append({"annotations": anno, **save_info})

    tex = load_tex(fileid)
    diff = compute_annotation_diff(tex, annos, tags, begin, end)

    return jsonify([dict(diff=d, **r) for d, r in zip(diff, result)]), 200


@app.post("/save/finalize")
@cross_origin()
def post_finalize_save():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    savename = request.args.get("savename")
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    finalized = finalize_save(fileid, userid, savename, timestamp)

    return {"finalized": finalized}, 200


@app.delete("/save")
@cross_origin()
def delete_delete_save():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    savename = request.args.get("savename")
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    delete_save(fileid, userid, savename, timestamp)
    return dict(timestamp=timestamp, userid=userid, fileid=fileid, savename=savename), 200


@app.get("/save/all")
@cross_origin()
def get_all_saves():
    fileid = request.args.get("fileid")
    userid = request.args.get("userid")
    final = bool(request.args.get("final"))
    return {"saves": load_saves(fileid=fileid, userid=userid, final=final)}


@app.get("/documents")
@cross_origin()
def get_all_documents():
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


@app.get("/save/name")
@cross_origin()
def get_savename():
    annoid = request.args.get("annoid")
    if annoid is None:
        return "Bad request: need annoid!", 400
    result = load_anno_from_annoid(annoid)

    return {
        "fileid": result["fileid"],
        "userid": result["userid"],
        "savename": result["savename"],
        "timestamp": result["timestamp"],
    }, 200


@app.get("/user/admin")
@cross_origin()
def get_is_admin():
    userid = request.args.get("userid")
    admin = userid in ["nilay", "jeff"]  # TODO move this to database
    return {"isAdmin": admin}, 200


@app.post("/user/authenticate")
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


@app.get("/dashboard")
@cross_origin()
def get_dashboard_data():
    tags = ["definition", "theorem", "proof", "example", "name"]
    data = load_dashboard_data(tags)
    items = []
    for (fileid, start, end), row in data.iterrows():
        items.append(
            dict(
                id=f"{fileid}:{start}:{end}",
                fileid=fileid,
                start=start,
                end=end,
                userData=[dict(userid=u, f1=f) for u, f in zip(row.userid, row.f1)],
            )
        )
    return json.dumps(items), 200


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
