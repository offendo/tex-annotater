#!/usr/bin/env python3
import uuid
from flask import Flask, request
from flask_cors import CORS, cross_origin
import base64
import re
import os
import sqlite3
import boto3

from backend.search import fuzzysearch
from .data import (
    load_tex,
    list_all_textbooks,
    load_all_annotations,
    load_pdf,
    load_save_files,
    load_annotations,
    save_annotations,
    list_s3_documents,
    init_annotation_db,
)
from .users import (
    add_user,
    authenticate_user,
    init_users_db,
)

from .search import fuzzysearch, index_books

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

init_annotation_db()
init_users_db()


@app.post("/annotations")
@cross_origin()
def post_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    annotations = request.get_json()["annotations"]
    save_annotations(fileid, userid, annotations)
    return "Success!", 200


@app.get("/annotations/all")
@cross_origin()
def get_all_annotations():
    annotations = load_all_annotations()

    return {
        "otherAnnotations": annotations,
    }, 200


@app.get("/annotations")
@cross_origin()
def get_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    if userid is None or fileid is None or timestamp is None:
        return "Bad request: need userid, fileid, and timestamp!", 400
    annotations = load_annotations(
        fileid, userid, timestamp if len(timestamp) else None
    )

    return {
        "fileid": fileid,
        "annotations": annotations,
    }, 200


@app.get("/saves")
@cross_origin()
def list_all_saves():
    fileid = request.args.get("fileid")
    userid = request.args.get("userid")
    return {"saves": load_save_files(file_id=fileid, user_id=userid)}


@app.get("/document/all")
@cross_origin()
def list_all_documents():
    return {"documents": list_s3_documents()}


@app.get("/document")
@cross_origin()
def get_document():
    fileid = request.args.get("fileid")
    if fileid is None:
        return 400, "Request requires fileid"
    tex = load_tex(fileid)

    arxiv_id = fileid.split("-")[0]
    if re.match(r"\d+\.\d+", arxiv_id):
        pdf = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
    else:
        pdf = str(base64.b64encode(load_pdf(fileid.replace(".tex", ".pdf"))))[2:-1]
    return {
        "fileid": fileid,
        "tex": tex,
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
    topk = int(request.args.get("topk", 5))
    if query is None:
        return "Error: no query provided", 400
    index = index_books("../../textbooks", "../../textbooks/index.csv")
    results = fuzzysearch(query, index, top_k=topk)
    return {"results": results}, 200
