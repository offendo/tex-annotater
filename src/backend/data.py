#!/usr/bin/env python3
import os
import sqlite3
import boto3
import pandas as pd
import randomname
import shelve
import time
import logging
from pathlib import Path

session = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
)
ANNOTATIONS_DB = os.environ["ANNOTATIONS_DB"]

CACHE_FILE = "/tmp/pdf_cache"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

def filecache(maxsize=None):
    def decorator(original_func):
        def new_func(file_name, *args, **kwargs):
            with shelve.open(CACHE_FILE) as cache, shelve.open(CACHE_FILE+'.lru') as times:
                if file_name in cache:
                    logger.debug('Cache hit!')
                    times[file_name] = time.time()
                    return cache[file_name]
                elif len(cache) == maxsize:
                    logger.debug('Cache full!')
                    # get the filename of the earliest timestamp
                    pop_value = sorted(list(times.items()), key=lambda x: x[1])[0][0]
                    del cache[pop_value]
                    del times[pop_value]
                else:
                    logger.debug('Cache miss!')
                new_val = original_func(file_name, *args, **kwargs)
                cache[file_name] = new_val
                times[file_name] = time.time()
                return new_val
        return new_func
    return decorator


def list_s3_documents():
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    names = [d["Key"].split("/")[-1] for d in docs if d["Key"].startswith("texs/")]
    return names

  
def load_pdf(file_name):
    # obj = session.get_object(Bucket="tex-annotation", Key=f"pdfs/{file_name}")
    # data = obj["Body"].read()
    url = f'https://tex-annotation.s3.amazonaws.com/pdfs/{file_name}'
    # return data
    return url


def load_tex(file_name):
    obj = session.get_object(Bucket="tex-annotation", Key=f"texs/{file_name}")
    data = obj["Body"].read()
    return data.decode()


def query_db(query, params=()):
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        conn.row_factory = sqlite3.Row
        results = conn.execute(query, params)
        records = [dict(r) for r in results]
    return records

def get_savename_from_annoid(annoid: str):
    query = "SELECT timestamp, fileid, userid, savename FROM annotations WHERE annoid = :annoid;"
    params = dict(annoid=annoid)
    return query_db(query, params)[0]

def list_all_textbooks():
    """Load the textbooks from the excel sheet."""
    sheet_id = "1XCkPQo__bxACu2dWUgCuRoH4FUeNc2ODCI1dpBO-n3U"
    sheet_name = "Sheet1"
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"
    df = pd.read_csv(url)
    return df


def load_save_files(file_id, user_id=None):
    """Loads all the annotation save files for a particular file/user"""
    conditions = ["fileid = :fileid"]
    params = dict(fileid=file_id)

    if user_id is not None:
        conditions.append("userid = :userid")
        params["userid"] = user_id

    query = (
        "SELECT DISTINCT userid, fileid, timestamp, savename FROM annotations WHERE "
        + " AND ".join(conditions)
        + " ORDER BY timestamp DESC;"
    )
    return query_db(query, params)


def load_all_annotations(fileid: str):
    """Loads all annotations"""
    query = """
        SELECT
            a.annoid, a.fileid, a.start, a.end, a.tag, a.text, a.color,
            l.start AS link_start, l.end AS link_end,
            l.tag AS link_tag, l.source AS link_source, l.target AS link_target,
            l.fileid AS link_fileid, l.color AS link_color
        FROM annotations a
        LEFT JOIN links l
        ON a.annoid = link_source
        WHERE a.timestamp = (SELECT MAX(timestamp) FROM annotations WHERE fileid = a.fileid)
          AND a.fileid != :fileid;
    """

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query, params=dict(fileid=fileid))
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)

    grouped = (
        annotations.groupby(
            ["annoid", "fileid", "start", "end", "tag", "text", "color"]
        )[
            [
                "link_start",
                "link_end",
                "link_tag",
                "link_fileid",
                "link_source",
                "link_target",
            ]
        ]
        .apply(
            lambda s: pd.Series(
                {
                    "links": s[
                        [
                            "link_start",
                            "link_end",
                            "link_tag",
                            "link_fileid",
                            "link_source",
                            "link_target",
                        ]
                    ]
                    .reset_index(drop=True)
                    .rename(columns=lambda x: x.strip("link_"))
                    .dropna()
                    .to_dict(orient="records")
                }
            )
        )
        .reset_index()
    )
    return grouped.to_dict(orient="records")


def load_annotations(file_id, user_id, timestamp=None):
    # use most recent save by default
    if not timestamp:
        result = query_db(
            "SELECT MAX(timestamp) FROM annotations WHERE fileid = :fileid AND userid = :userid;",
            params=dict(fileid=file_id, userid=user_id),
        )
        result = pd.DataFrame.from_records(result)
        if len(result) == 0 or result.iloc[0] is None:
            return []
        timestamp = result.iloc[0]["MAX(timestamp)"]

    query = """
        SELECT
          a.annoid, a.fileid, a.start, a.end, a.tag, a.text, a.color,
          l.start AS link_start, l.end AS link_end, l.tag AS link_tag,
          l.source AS link_source, l.target AS link_target, l.fileid AS link_fileid, l.color AS link_color
        FROM annotations a
        LEFT JOIN links l
        ON a.annoid = link_source
        WHERE a.fileid = :fileid
        AND a.timestamp = :timestamp;
    """
    params = dict(fileid=file_id, userid=user_id, timestamp=timestamp)

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query, params=params)
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)
    grouped = annotations.groupby(
        ["annoid", "fileid", "start", "end", "tag", "text", "color"]
    )[
        [
            "link_source",
            "link_target",
            "link_start",
            "link_color",
            "link_end",
            "link_tag",
            "link_fileid",
        ]
    ].apply(
        lambda s: pd.Series(
            {
                "links": s.reset_index(drop=True)
                .rename(columns=lambda x: x.strip("link_"))
                .dropna()
                .to_dict(orient="records")
            }
        )
    )
    # assign the annotations to the current state
    return grouped.reset_index().to_dict(orient="records")


def save_annotations(file_id, user_id, annotations, autosave: bool = False):
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        savename = randomname.get_name()
        # Insert new entries
        if autosave:
            conn.execute(
                """
                DELETE FROM annotations WHERE savename = 'autosave';
                """
            )
        for an in annotations:
            links = an["links"]
            conn.execute(
                """
                INSERT INTO annotations (annoid, fileid, userid, start, end, text, tag, color, savename)
                    VALUES (:annoid, :fileid, :userid, :start, :end, :text, :tag, :color, :savename)
                ON CONFLICT(fileid,userid,start,end,tag,savename) DO NOTHING;
                """,
                dict(
                    annoid=an["annoid"],
                    fileid=file_id,
                    userid=user_id,
                    start=an["start"],
                    end=an["end"],
                    text=an["text"],
                    tag=an["tag"],
                    color=an.get("color", "#d3d3d3"),
                    savename="autosave" if autosave else savename,
                ),
            )
            conn.executemany(
                """
                INSERT INTO links (fileid, userid, start, end, tag, color, source, target)
                    VALUES (:fileid, :userid, :start, :end, :tag, :color, :source, :target)
                ON CONFLICT(fileid,userid,start,end,tag,source,target) DO NOTHING;
                """,
                [
                    dict(
                        fileid=ln['fileid'],
                        userid=user_id,
                        start=ln["start"],
                        end=ln["end"],
                        tag=ln["tag"],
                        color=ln.get("color", "#d3d3d3"),
                        source=ln["source"],
                        target=ln["target"],
                    )
                    for ln in links
                ],
            )
    return True


def init_annotation_db():
    with sqlite3.connect(ANNOTATIONS_DB) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS annotations
            (
                rowid INTEGER PRIMARY KEY,
                annoid TEXT,
                fileid TEXT,
                userid TEXT,
                start INTEGER,
                end INTEGER,
                text TEXT,
                tag TEXT,
                color TEXT,
                savename TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (fileid, userid, start, end, tag, savename)
            );
        """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS links
            (
                linkid INTEGER PRIMARY KEY,
                fileid TEXT,
                userid TEXT,
                start INTEGER,
                end INTEGER,
                tag TEXT,
                color TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                source TEXT,
                target TEXT,
                UNIQUE (fileid, userid, start, end, tag, source, target),
                FOREIGN KEY(source) REFERENCES annotations(annoid)
                FOREIGN KEY(target) REFERENCES annotations(annoid)
            );
        """
        )
