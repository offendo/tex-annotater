#!/usr/bin/env python3
from flask import Flask, request
from flask_cors import CORS, cross_origin
import os
import sqlite3
import boto3

app = Flask(__name__)
cors = CORS(app)
app.config["CORS_HEADERS"] = "Content-Type"

s3 = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
)


def download_s3(bucket, filename):
    s3.download_file(bucket, "k.png", "")


def load_tex(fname):
    with open(fname, "r") as f:
        content = f.read()
    return {"content": content}


@app.get("/saves/")
@cross_origin()
def load_saves():
    userid = request.args.get("userid")
    fileid = request.args.get("fileid")
    savename = request.args.get("savename")

    return load_tex(
        "/users/offendo/src/autoformalization/annotation/texs/0705.1690-alpha-Brjuno_arxiv.tex"
    )
