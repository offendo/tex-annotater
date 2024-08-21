#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime

import boto3
import psycopg
from psycopg.adapt import Loader
from psycopg.rows import dict_row

# Open aws session to s3
session = boto3.client(
    "s3",
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", None),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", None),
)


# Register adapter to make sure psycopg3 returns datetime strings instead of objects
class TimestampLoader(Loader):
    def load(self, data):
        return bytes(data).decode()


psycopg.adapters.register_loader("timestamp", TimestampLoader)
psycopg.adapters.register_loader("timestamptz", TimestampLoader)


def parse_timestamp(t_str: str):
    # Yeah I know...
    if "." not in t_str:
        t_str = t_str[:-3] + ".0" + " 00"
    if t_str.endswith(" 00"):
        timestamp = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S.%f 00")
    elif t_str.endswith("+00"):
        timestamp = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S.%f+00")
    else:
        timestamp = datetime.strptime(t_str, "%Y-%m-%d %H:%M:%S.%f")
    return timestamp


def query_db(query, params=()):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        results = conn.execute(query, params)
        records = [dict(r) for r in results]
    return records


def get_secret(secret_name):
    client = boto3.client("secretsmanager")
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    secret = json.loads(get_secret_value_response["SecretString"])
    return secret


POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", None)
if POSTGRES_PASSWORD is None:
    POSTGRES_PASSWORD = get_secret("tex-annotater-postgres-password")["password"]

CONN_STR = (
    f"host=postgres port=5432 dbname=annotations-db connect_timeout=10 user=postgres password='{POSTGRES_PASSWORD}'"
)

# S3 stuff


def list_s3_documents():
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    objs = [
        {
            "name": d["Key"].replace("texs/", ""),
            "modified": d["LastModified"].strftime("'%y %b %d @%H:%M"),
            "size": f"{int(d['Size']) / 1024:.1f}",
        }
        for d in docs
        if d["Key"].startswith("texs/")
    ]

    result = []
    for obj in objs:
        name = obj["name"]
        if re.match(r"\d+\.\d+-", name):
            arxiv_id, stem = name.split("-", maxsplit=1)
            stem = stem.replace(".tex", "")
        else:
            arxiv_id = ""
            stem = name.replace(".tex", "")
        result.append({"arxiv_id": arxiv_id, "stem": stem, **obj})
    return result


def load_pdf(pdf_key):
    url = f"https://tex-annotation.s3.amazonaws.com/pdfs/{pdf_key}"
    return url


def load_tex(obj_key):
    obj = session.get_object(Bucket="tex-annotation", Key=f"texs/{obj_key}")
    data = obj["Body"].read()
    return data.decode()
