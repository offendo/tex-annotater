#!/usr/bin/env python3
import os
import json

from datetime import datetime
import boto3
import psycopg
from botocore.exceptions import ClientError
from psycopg.adapt import Loader
from psycopg.rows import dict_row


# Register adapter to make sure psycopg3 returns datetime strings instead of objects
class TimestampLoader(Loader):
    def load(self, data):
        return bytes(data).decode()


psycopg.adapters.register_loader("timestamp", TimestampLoader)
psycopg.adapters.register_loader("timestamptz", TimestampLoader)

def parse_timestamp(t_str):
    # Yeah I know...
    if '.' not in t_str:
        t_str = t_str[:-3] + '.0' + ' 00'
    timestamp = datetime.strptime(t_str, '%Y-%m-%d %H:%M:%S.%f 00')
    return timestamp

def query_db(query, params=()):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        results = conn.execute(query, params)
        records = [dict(r) for r in results]
    return records


def get_secret(secret_name):
    client = boto3.client("secretsmanager", region="us-west-1")
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    secret = json.loads(get_secret_value_response["SecretString"])
    return secret


POSTGRES_PASSWORD = os.environ.get("POSTGRES_PASSWORD", None)
if POSTGRES_PASSWORD is None:
    POSTGRES_PASSWORD = get_secret("tex-annotater-postgres-password")["password"]

CONN_STR = (
    f"host=postgres port=5432 dbname=annotations-db connect_timeout=10 user=postgres password='{POSTGRES_PASSWORD}'"
)
