#!/usr/bin/env python3
from flask import Flask, request
from flask_cors import CORS, cross_origin
import base64
import re
import os
import sqlite3
import boto3
from .data import (
    load_tex,
    load_textbook_list,
    load_all_annotations,
    load_pdf,
    load_save_files,
    load_annotations,
    save_annotations,
    list_s3_documents,
    init_annotation_db,
)

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

init_annotation_db()

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
    annotations = load_annotations(fileid, userid, timestamp if len(timestamp) else None)

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
