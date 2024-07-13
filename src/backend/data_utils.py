#!/usr/bin/env python3
import logging
import os
import re
import psycopg
from pathlib import Path
from typing import Optional
from datetime import datetime

import boto3
import gdown
import pandas as pd
import randomname
from transformers import BatchEncoding, PreTrainedTokenizer
from psycopg.rows import dict_row
from psycopg.adapt import Loader

POSTGRES_PASSWORD = os.environ["POSTGRES_PASSWORD"]
CONN_STR = f"host=postgres port=5432 dbname=annotations-db connect_timeout=10 user=postgres password={POSTGRES_PASSWORD}"

class TimestampLoader(Loader):
    def load(self, data):
        return bytes(data).decode();

psycopg.adapters.register_loader('timestamp', TimestampLoader)

def query_db(query, params=()):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        results = conn.execute(query, params)
        records = [dict(r) for r in results]
    return records
