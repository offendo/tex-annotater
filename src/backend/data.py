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
from .data_utils import CONN_STR, query_db, parse_timestamp

session = boto3.client(
    "s3",
    aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", None),
    aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", None),
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()


# Register adapter to make sure psycopg3 returns datetime strings instead of objects
class TimestampLoader(Loader):
    def load(self, data):
        return bytes(data).decode()


psycopg.adapters.register_loader("timestamp", TimestampLoader)
psycopg.adapters.register_loader("timestamptz", TimestampLoader)


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
    # names = [d["Key"].replace("texs/", "") for d in docs if d["Key"].startswith("texs/")]

    result = []
    for obj in objs:
        name = obj["name"]
        if re.match(r"\d+\.\d+-", name):
            arxiv_id, filename = name.split("-", maxsplit=1)
            filename = filename.replace(".tex", "")
        else:
            arxiv_id = ""
            filename = name.replace(".tex", "")
        result.append({"arxiv_id": arxiv_id, "filename": filename, **obj})
    return result


def load_pdf(pdf_key):
    url = f"https://tex-annotation.s3.amazonaws.com/pdfs/{pdf_key}"
    return url


def load_tex(obj_key):
    obj = session.get_object(Bucket="tex-annotation", Key=f"texs/{obj_key}")
    data = obj["Body"].read()
    return data.decode()


def get_savename_from_annoid(annoid: str):
    query = """SELECT "timestamp", fileid, userid, savename FROM annotations WHERE annoid = %(annoid)s;"""
    params = dict(annoid=annoid)
    return query_db(query, params)[0]


def get_save_info_from_timestamp(timestamp: str):
    timestamp = parse_timestamp(timestamp)
    query = """SELECT * FROM saves WHERE "timestamp" = %(timestamp)s;"""
    params = dict(timestamp=timestamp)
    return query_db(query, params)[0]


def list_all_textbooks():
    """Load the textbooks from the excel sheet."""
    sheet_id = "1XCkPQo__bxACu2dWUgCuRoH4FUeNc2ODCI1dpBO-n3U"
    sheet_name = "Sheet1"
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"
    df = pd.read_csv(url)
    return df


def upload_new_textbooks():
    df = list_all_textbooks()
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    existing = [d["Key"].replace("pdfs/", "").replace(".pdf", "") for d in docs if d["Key"].startswith("pdfs/")]
    for idx, row in df.iterrows():
        if row["name"] not in existing:
            # download and upload tex file
            tex_id = row["tex"].split("/")[5]
            tex_out = gdown.download(id=tex_id, output=f"/tmp/{row['name']}.tex")
            session.upload_file(tex_out, 'tex-annotation', f"texs/{Path(tex_out).name}", ExtraArgs={'ACL':'public-read', 'ContentType': 'application/x-tex'})
            # download and upload pdf file
            pdf_id = row.pdf.split("/")[5]
            pdf_out = gdown.download(id=pdf_id, output=f"/tmp/{row['name']}.pdf")
            session.upload_file(
                pdf_out,
                "tex-annotation",
                f"pdfs/{Path(pdf_out).name}",
                ExtraArgs={"ACL": "public-read", "ContentType": "application/pdf"},
            )

            # remove both
            os.remove(tex_out)
            os.remove(pdf_out)
            logger.info(f"Uploaded {Path(tex_out).name} to S3.")


def load_save_files(file_id, user_id=None):
    """Loads all the annotation save files for a particular file/user"""
    conditions = ["a.fileid = %(fileid)s"]
    params = dict(fileid=file_id)

    if user_id is not None:
        conditions.append("a.userid = %(userid)s")
        params["userid"] = user_id

    query = (
        """SELECT a.userid, a.fileid, a.timestamp, a.savename, a.autosave, s.final, COUNT(*) AS count
           FROM annotations a
           LEFT JOIN saves s
             ON a.fileid = s.fileid AND a.userid = s.userid AND a.timestamp = s.timestamp AND a.savename = s.savename
           WHERE """
        + " AND ".join(conditions)
        + " GROUP BY a.userid, a.fileid, a.timestamp, a.savename, a.autosave, s.final"
        + " ORDER BY a.timestamp DESC;"
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
        ON a.annoid = l.source
        WHERE a.timestamp = (SELECT MAX("timestamp") FROM annotations WHERE fileid = a.fileid)
          AND a.fileid != %(fileid)s;
    """

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query, params=dict(fileid=fileid))
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)

    grouped = (
        annotations.groupby(["annoid", "fileid", "start", "end", "tag", "text", "color"])[
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


def load_annotations(file_id, user_id, timestamp=None, add_timestamp_to_ids: bool = False):
    # use most recent save by default
    if not timestamp:
        result = query_db(
            """SELECT MAX("timestamp") FROM annotations WHERE fileid = %(fileid)s AND userid = %(userid)s;""",
            params=dict(fileid=file_id, userid=user_id),
        )
        result = pd.DataFrame.from_records(result)
        if len(result) == 0 or result.iloc[0] is None:
            return []
        timestamp = result.iloc[0][result.columns[0]]

    query = """
        SELECT
          a.annoid, a.fileid, a.start, a.end, a.tag, a.text, a.color,
          l.start AS link_start, l.end AS link_end, l.tag AS link_tag,
          l.source AS link_source, l.target AS link_target, l.fileid AS link_fileid, l.color AS link_color,
          s.final AS final
        FROM annotations a
        LEFT JOIN links l
            ON a.annoid = l.source
            AND a.timestamp = l.timestamp
        LEFT JOIN saves s
            ON a.savename = s.savename
            AND a.timestamp = s.timestamp
            AND a.userid = s.userid
            AND a.fileid = s.fileid
        WHERE a.fileid = %(fileid)s
        AND a.timestamp = %(timestamp)s;
    """

    # For some reason, somewhere in the process the timestamp is being mangled
    # so it's no longer interpretable by psycopg.
    # In order to get a proper query, we have to manually parse it like this
    # and then pass that as a parameter instead of the given timestamp. I don't
    # know why...I think the only difference is the lack of a '+' before the
    # timezone 00 at the end, which may be mangled by over HTTP.
    parsed = parse_timestamp(timestamp)
    params = dict(fileid=file_id, userid=user_id, timestamp=parsed)

    # Query for annotations, but we don't care about user or file id
    annotations = query_db(query, params=params)
    if len(annotations) == 0:
        return []

    annotations = pd.DataFrame.from_records(annotations)
    grouped = annotations.groupby(["annoid", "fileid", "start", "end", "tag", "text", "color"])[
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
    grouped = grouped.reset_index()
    if add_timestamp_to_ids:
        grouped['annoid'] = timestamp + grouped['annoid']
        def _update_link_with_timestamp(links):
            result = []
            for link in links:
                new = {}
                for key, val in link.items():
                    if key == 'source' or key == 'target':
                        new[key] = timestamp + val
                    else:
                        new[key] = val
                result.append(new)
            return result

        grouped['links'] = grouped['links'].apply(lambda links: _update_link_with_timestamp(links))
    return grouped.to_dict(orient="records")


def save_annotations(file_id, user_id, annotations, autosave: int = 0, savename: str | None = None):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        if not savename:
            savename = randomname.get_name()

        # Delete autosaves if we're about to overwrite.
        if autosave:
            conn.execute(
                """
                DELETE FROM annotations WHERE fileid = %(fileid)s AND userid = %(userid)s AND savename = %(savename)s AND autosave = %(autosave)s;
                """,
                dict(savename=savename, autosave=int(autosave), fileid=file_id, userid=user_id),
            )
            conn.execute(
                """
                DELETE FROM saves WHERE fileid = %(fileid)s AND userid = %(userid)s AND savename = %(savename)s AND autosave = %(autosave)s;
                """,
                dict(savename=savename, autosave=int(autosave), fileid=file_id, userid=user_id),
            )

        # Create save if needed
        conn.execute(
            """
            INSERT INTO saves (fileid, userid, savename, final, autosave)
                VALUES (%(fileid)s, %(userid)s, %(savename)s, %(final)s, %(autosave)s)
            ON CONFLICT(fileid, userid, savename, autosave, "timestamp") DO NOTHING;
            """,
            dict(fileid=file_id, userid=user_id, savename=savename, autosave=int(autosave), final=0),
        )

        # Insert new entries
        for an in annotations:
            links = an["links"]
            conn.execute(
                """
                INSERT INTO annotations (annoid, fileid, userid, start, "end", text, tag, color, savename, autosave)
                    VALUES (%(annoid)s, %(fileid)s, %(userid)s, %(start)s, %(end)s, %(text)s, %(tag)s, %(color)s, %(savename)s, %(autosave)s)
                ON CONFLICT(fileid,userid,start,"end",tag,savename,"timestamp",autosave) DO NOTHING;
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
                    savename=savename,
                    autosave=int(autosave),
                ),
            )
            # Insert all the links
            for ln in links:
                conn.execute(
                    """
                    INSERT INTO links (fileid, userid, start, "end", tag, color, source, target)
                        VALUES (%(fileid)s, %(userid)s, %(start)s, %(end)s, %(tag)s, %(color)s, %(source)s, %(target)s)
                    ON CONFLICT(fileid,userid,start,"end",tag,source,target,"timestamp") DO NOTHING;
                    """,
                    dict(
                        fileid=ln["fileid"],
                        userid=user_id,
                        start=ln["start"],
                        end=ln["end"],
                        tag=ln["tag"],
                        color=ln.get("color", "#d3d3d3"),
                        source=ln["source"],
                        target=ln["target"],
                    ),
                )
        result = conn.execute(
            """SELECT "timestamp" FROM annotations WHERE savename = %(savename)s AND autosave = %(autosave)s;""",
            dict(savename=savename, autosave=int(autosave)),
        )
        top = result.fetchone()
        # Return timestamp if it exists
        if top is not None:
            stamp = top["timestamp"]
        else:
            stamp = conn.execute("SELECT CURRENT_TIMESTAMP").fetchone()["timestamp"]
        return {"timestamp": stamp, "savename": savename, "fileid": file_id, "userid": user_id}


def mark_save_as_final(file_id, user_id, savename, timestamp):
    parsed = parse_timestamp(timestamp)
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        conn.execute(
            """
            UPDATE saves
              SET final = ((final | 1) - (final & 1))
            WHERE fileid = %(fileid)s
              AND userid = %(userid)s
              AND savename = %(savename)s
              AND "timestamp" = %(timestamp)s;
            """,
            dict(savename=savename, fileid=file_id, userid=user_id, timestamp=parsed),
        )
        return True


def init_annotation_db():
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS annotations
            (
                rowid SERIAL PRIMARY KEY,
                annoid TEXT,
                fileid TEXT,
                userid TEXT,
                start INTEGER,
                "end" INTEGER,
                text TEXT,
                tag TEXT,
                color TEXT,
                savename TEXT,
                autosave INTEGER,
                "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (fileid, userid, start, "end", tag, savename, "timestamp", autosave)
            );
        """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS links
            (
                linkid SERIAL PRIMARY KEY,
                fileid TEXT,
                userid TEXT,
                start INTEGER,
                "end" INTEGER,
                tag TEXT,
                color TEXT,
                "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                source TEXT,
                target TEXT,
                UNIQUE (fileid, userid, start, "end", tag, source, target, "timestamp")
            );
        """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS saves
            (
                saveid SERIAL PRIMARY KEY,
                savename TEXT,
                fileid TEXT,
                userid TEXT,
                final INTEGER,
                autosave INTEGER,
                "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (savename, fileid, userid, autosave, "timestamp")
            );
        """
        )


def export_annotations(
    file_id,
    user_id,
    timestamp: Optional[str] = None,
    export_whole_file: bool = False,
    tokenizer: Optional[PreTrainedTokenizer] = None,
    begin: Optional[dict] = None,
    end: Optional[dict] = None,
):
    # annotations is a list of dicts, each containing an annotation. We want to format this into an IOB tagged block of text.
    annotations = load_annotations(file_id, user_id, timestamp)
    tex = load_tex(file_id)

    # Find the begin/end annotations, otherwise use the earliest and latest annotations
    if begin is None:
        for anno in annotations:
            if anno["tag"] == "begin annotation":
                begin = anno
                break
    if end is None:
        for anno in annotations:
            if anno["tag"] == "end annotation":
                end = anno
                break

    if begin is None:
        begin = min(annotations, key=lambda x: x["start"])
    if end is None:
        end = max(annotations, key=lambda x: x["end"])

    offset = 0
    if not export_whole_file:
        tex = tex[begin["start"] : end["end"]]
        offset = begin["start"]

    # Now, we generate character-level IOB tags, which we can then merge together to create word/token level ones.
    iob_tags = [[] for _ in tex]

    for anno in annotations:
        # Ignore begin/end markers
        if anno["tag"] in ["begin annotation", "end annotation"]:
            continue

        for char_idx in range(anno["start"], anno["end"]):
            prefix = "B-" if char_idx == anno["start"] else "I-"
            iob_tags[char_idx - offset].append(prefix + anno["tag"])
            # iob_tags[char_idx - offset].append(anno["tag"])

    for tag in iob_tags:
        if len(tag) == 0:
            tag.append("O")

    if tokenizer:
        tokens = tokenizer(tex, add_special_tokens=False)
        token_tags = align_tags_to_tokens(tokens, char_tags=iob_tags)

        # Returns a list of (token, [tags])
        return {
            "iob_tags": [
                (tokenizer.convert_ids_to_tokens(i), tags) for i, tags in zip(tokens["input_ids"], token_tags)
            ],
            "annotations": annotations,
            "tex": tex,
            "begin": begin,
            "end": end,
        }

    return {
        "iob_tags": [(char, tag) for char, tag in zip(tex, iob_tags)],
        "tex": tex,
        "annotations": annotations,
        "begin": begin,
        "end": end,
    }


def align_tags_to_tokens(tokens: BatchEncoding, char_tags: list[list[str]]):
    aligned_tags = []
    for idx in range(len(tokens.input_ids)):
        span = tokens.token_to_chars(idx)
        if span is None:
            continue

        tags_for_token = list({tag for token_tags in char_tags[span.start : span.end] for tag in token_tags})
        if "O" in tags_for_token and len(tags_for_token) > 1:
            tags_for_token.remove("O")

        # Ensure that we only have B- or I- but not both
        for tag in tags_for_token:
            b = tag.replace("I-", "B-")
            i = tag.replace("B-", "I-")
            if b in tags_for_token and i in tags_for_token:
                tags_for_token.remove(i)
        aligned_tags.append(tags_for_token)
    return aligned_tags


def _find_annos_at_index(annos: list[dict], index: int) -> set[str]:
    result = set()
    for anno in annos:
        start = anno['start']
        end = anno['end']
        tag = anno['tag']
        if start <= index <= end:
            result.add((start, end, tag))
    return result


def load_annotation_diff(tex: str, annos_list: list[list[dict]], tags: list[str]):
    N = len(annos_list)

    # Initialize the diffs, empty list for each character index
    annos_at_index = [[set() for _ in tex] for _ in annos_list]
    diffs = [set() for _ in annos_list]

    # for each character, add all the annotations that exist at that index
    for idx, char in enumerate(tex):
        for anno_idx, annos in enumerate(annos_list):
            annos_at_index[anno_idx][idx] = _find_annos_at_index(annos, idx)

        # now compute the diffs
        intersection = set.intersection(*(annos_at_index[i][idx] for i in range(N)))
        for a in range(N):
            # only add diffs for those things that are in the tags
            annos = [i for i in annos_at_index[a][idx].difference(intersection) if i[-1] in tags]
            diffs[a].update(annos)

    # Return a list of annotations which are part of the diff
    return [
        [a for a in annos_list[idx] if (a['start'], a['end'], a['tag']) in d]
        for idx, d in enumerate(diffs)
    ]
