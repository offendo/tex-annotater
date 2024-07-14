#!/usr/bin/env python3
import os
import json

import boto3
import psycopg
from botocore.exceptions import ClientError
from psycopg.adapt import Loader
from psycopg.rows import dict_row


def get_secret(secret_name):
    client = boto3.client('secretsmanager', region='us-west-1')
    get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    secret = json.loads(get_secret_value_response['SecretString'])
    return secret

POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD', None)
if POSTGRES_PASSWORD is None:
    POSTGRES_PASSWORD = get_secret('tex-annotater-postgres-password')['password']
CONN_STR = f"host=postgres port=5432 dbname=annotations-db connect_timeout=10 user=postgres password='{POSTGRES_PASSWORD}'"