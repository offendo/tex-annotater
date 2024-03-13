#!/usr/bin/env python3
from flask import Flask, request
from flask_cors import CORS, cross_origin
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
)

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"


@app.post("/annotations")
@cross_origin()
def post_annotations():
    userid = request.args.get("fileid")
    fileid = request.args.get("userid")
    annotations = request.get_json()["annotations"]
    save_annotations(fileid, userid, annotations)
    return "Success!", 200


@app.get("/annotations/all")
@cross_origin()
def get_all_annotations():
    fileid = request.args.get("fileid")
    annotations = load_all_annotations(fileid)

    return {
        "fileid": fileid,
        "otherAnnotations": annotations,
    }, 200


@app.get("/annotations")
@cross_origin()
def get_annotations():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    timestamp = request.args.get("timestamp")
    annotations = load_annotations(fileid, userid, timestamp)

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


@app.get("/document")
@cross_origin()
def get_document():
    fileid = request.args.get("fileid")

    tex = load_tex("0705.1690-alpha-Brjuno_arxiv.tex")
    return {
        "fileid": fileid,
        "tex": tex,
    }
