#!/usr/bin/env python3
import os
import sqlite3
import boto3
import pandas as pd
import randomname

session = boto3.client(
    "s3",
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
)
ANNOTATIONS_DB = os.environ["ANNOTATIONS_DB"]


def list_s3_documents():
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    names = [d['Key'].split('/')[-1] for d in docs if d['Key'].startswith("texs/")]
    return names


def load_pdf(file_name):
    obj = session.get_object(Bucket="tex-annotation", Key=f"pdfs/{file_name}")
    data = obj["Body"].read()
    return data


def load_tex(file_name):
    obj = session.get_object(Bucket="tex-annotation", Key=f"texs/{file_name}")
    data = obj["Body"].read()
    return data.decode()


def query_db(query, params=()):
    conn = sqlite3.Connection(ANNOTATIONS_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    results = cur.execute(query, params)
    # df = pd.DataFrame.from_records([dict(r) for r in results])
    records = [dict(r) for r in results]
    conn.close()
    return records


def load_textbook_list():
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
        "SELECT DISTINCT userid, fileid, timestamp FROM annotations WHERE "
        + " AND ".join(conditions)
        + " ORDER BY timestamp DESC;"
    )
    columns = ["timestamp", "savename", "userid"]
    return query_db(query, params)


def load_all_annotations():
    """Loads all annotations"""
    query = """
        SELECT a.fileid, a.start, a.end, a.tag, a.text, a.color, l.start AS link_start, l.end AS link_end, l.tag AS link_tag, l.annotation AS link_annoid, l.fileid AS link_fileid, l.color AS link_color
        FROM annotations a
        LEFT JOIN links l
        ON a.annoid = l.annotation
        WHERE a.timestamp = (SELECT MAX(timestamp) FROM annotations WHERE fileid = a.fileid)
    """

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query)
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)

    grouped = (
        annotations.groupby(["fileid", "start", "end", "tag", "text", "color"])[
            ["link_start", "link_end", "link_tag", "link_fileid"]
        ]
        .apply(
            lambda s: pd.Series(
                {
                    "links": s[["link_start", "link_end", "link_tag", "link_fileid"]]
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
          l.annotation AS link_annoid, l.fileid AS link_fileid, l.color AS link_color
        FROM annotations a
        LEFT JOIN links l
        ON a.annoid = l.annotation
        WHERE a.fileid = :fileid
        AND a.userid = :userid
        AND a.timestamp = :timestamp;
    """
    params = dict(fileid=file_id, userid=user_id, timestamp=timestamp)

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query, params=params)
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)
    grouped = annotations.groupby(["annoid", "fileid", "start", "end", "tag", "text", "color"])[["link_annoid", "link_start", "link_color", "link_end", "link_tag", "link_fileid"]].apply(
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


def save_annotations(file_id, user_id, annotations):
    conn = sqlite3.Connection(ANNOTATIONS_DB)
    cur = conn.cursor()
    savename = randomname.get_name()
    # Insert new entries
    for an in annotations:
        links = an["links"]
        result = cur.execute(
            """
            INSERT INTO annotations (fileid, userid, start, end, text, tag, color, savename)
                VALUES (:fileid, :userid, :start, :end, :text, :tag, :color, :savename)
            ON CONFLICT(fileid,userid,start,end,tag,savename) DO NOTHING
            RETURNING (annoid);
            """,
            dict(
                fileid=file_id,
                userid=user_id,
                start=an["start"],
                end=an["end"],
                text=an["text"],
                tag=an["tag"],
                color=an.get("color", "#d3d3d3"),
                savename=savename,
            ),
        )
        annoid = result.fetchone()[0]  # type:ignore
        for ln in links:
            cur.execute(
                """
                INSERT INTO links (fileid, userid, start, end, tag, color, annotation)
                    VALUES (:fileid, :userid, :start, :end, :tag, :color, :annoid)
                ON CONFLICT(fileid,userid,start,end,tag,annotation) DO NOTHING;
                """,
                dict(
                    fileid=file_id,
                    userid=user_id,
                    start=ln["start"],
                    end=ln["end"],
                    tag=ln["tag"],
                    color=ln.get("color", "#d3d3d3"),
                    annoid=annoid,
                ),
            )

    conn.commit()
    conn.close()
    return True


def init_annotation_db():
    conn = sqlite3.Connection(ANNOTATIONS_DB)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS annotations
        (
            annoid TEXT PRIMARY KEY,
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
    cur.execute(
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
            annotation TEXT,
            UNIQUE (fileid, userid, start, end, tag, annotation),
            FOREIGN KEY(annotation) REFERENCES annotations(annoid)
        );
    """
    )
    conn.commit()
    conn.close()
