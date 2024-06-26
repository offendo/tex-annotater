#!/usr/bin/env python3
import os
import sqlite3
from typing import Optional
import boto3
from gdown.download import shutil
import pandas as pd
import randomname
import shelve
import time
import logging
import gdown
import re
from transformers import BatchEncoding, PreTrainedTokenizer
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
            with shelve.open(CACHE_FILE) as cache, shelve.open(CACHE_FILE + ".lru") as times:
                if file_name in cache:
                    logger.debug("Cache hit!")
                    times[file_name] = time.time()
                    return cache[file_name]
                elif len(cache) == maxsize:
                    logger.debug("Cache full!")
                    # get the filename of the earliest timestamp
                    pop_value = sorted(list(times.items()), key=lambda x: x[1])[0][0]
                    del cache[pop_value]
                    del times[pop_value]
                else:
                    logger.debug("Cache miss!")
                new_val = original_func(file_name, *args, **kwargs)
                cache[file_name] = new_val
                times[file_name] = time.time()
                return new_val

        return new_func

    return decorator


def list_s3_documents():
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    objs = [
        {
            'name': d["Key"].replace("texs/", ""),
            'modified': d['LastModified'].strftime("'%y %b %d @%H:%M"),
            'size': f"{int(d['Size']) / 1024:.1f}",
        }
        for d in docs if d["Key"].startswith("texs/")
    ]
    # names = [d["Key"].replace("texs/", "") for d in docs if d["Key"].startswith("texs/")]

    result = []
    for obj in objs:
        name = obj['name']
        if re.match(r"\d+\.\d+-", name):
            arxiv_id, filename = name.split('-', maxsplit=1)
            filename = filename.replace('.tex', '')
        else:
            arxiv_id = ""
            filename = name.replace('.tex', '')
        result.append({'arxiv_id': arxiv_id, "filename": filename, **obj })
    return result


def load_pdf(pdf_key):
    url = f"https://tex-annotation.s3.amazonaws.com/pdfs/{pdf_key}"
    return url


def load_tex(obj_key):
    obj = session.get_object(Bucket="tex-annotation", Key=f"texs/{obj_key}")
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

def upload_new_textbooks():
    df = list_all_textbooks()
    docs = session.list_objects(Bucket="tex-annotation")["Contents"]
    existing = [d["Key"].replace("pdfs/", "").replace('.pdf', '') for d in docs if d["Key"].startswith("pdfs/")]
    for idx, row in df.iterrows():
        if row['name'] not in existing:
            # download and upload tex file
            tex_id = row['tex'].split('/')[5]
            tex_out = gdown.download(id=tex_id, output=f"/tmp/{row['name']}.tex")
            session.upload_file(tex_out, 'tex-annotation', f"texs/{Path(tex_out).name}", ExtraArgs={'ACL':'public-read', 'ContentType': 'application/pdf'})

            # download and upload pdf file
            pdf_id = row.pdf.split('/')[5]
            pdf_out = gdown.download(id=pdf_id, output=f"/tmp/{row["name"]}.pdf")
            session.upload_file(pdf_out, 'tex-annotation', f'pdfs/{Path(pdf_out).name}', ExtraArgs={'ACL':'public-read', 'ContentType': 'application/pdf'})

            # remove both
            os.remove(tex_out)
            os.remove(pdf_out)
            logger.info(f"Uploaded {Path(tex_out).name} to S3.")


def load_save_files(file_id, user_id=None):
    """Loads all the annotation save files for a particular file/user"""
    conditions = ["fileid = :fileid"]
    params = dict(fileid=file_id)

    if user_id is not None:
        conditions.append("userid = :userid")
        params["userid"] = user_id

    query = (
        "SELECT userid, fileid, timestamp, savename, COUNT(*) AS count FROM annotations WHERE "
        + " AND ".join(conditions)
        + " GROUP BY userid, fileid, timestamp, savename"
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
                        fileid=ln["fileid"],
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
        result = conn.execute(
            "SELECT timestamp FROM annotations WHERE savename = :savename;",
            dict(savename="autosave" if autosave else savename),
        )
        top = result.fetchone()
        # Return timestamp if it exists
        if top is not None:
            return top[0]
        return conn.execute("SELECT CURRENT_TIMESTAMP").fetchone()[0]


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


def export_annotations(file_id, user_id, timestamp: Optional[str] = None, export_whole_file: bool = False, tokenizer: Optional[PreTrainedTokenizer] = None):
    # annotations is a list of dicts, each containing an annotation. We want to format this into an IOB tagged block of text.
    annotations = load_annotations(file_id, user_id, timestamp)
    tex = load_tex(file_id)

    # Find the begin/end annotations, otherwise use the earliest and latest annotations
    begin = None
    end = None

    # # earliest begin_annotation
    # for anno in annotations:
    #     if anno['tag'] == 'begin_annotation':
    #         begin = anno
    #         break
    # # latest end_annotation
    # for anno in annotations:
    #     if anno['tag'] == 'end_annotation':
    #         end = anno

    if begin is None:
        begin = min(annotations, key=lambda x: x['start'])
    if end is None:
        end = max(annotations, key=lambda x: x['end'])

    offset = 0
    if not export_whole_file:
        tex = tex[begin['start']:end['end']]
        offset = begin['start']

    # Now, we generate character-level IOB tags, which we can then merge together to create word/token level ones.
    iob_tags = [[] for _ in tex]

    for anno in annotations:
        # Ignore begin/end markers
        if anno['tag'] in ['begin_annotation', 'end_annotation']:
            continue

        for char_idx in range(anno['start'], anno['end']):
            # prefix = 'B-' if char_idx == anno['start'] else 'I-'
            # iob_tags[char_idx - offset].append(prefix + anno['tag'])
            iob_tags[char_idx - offset].append(anno['tag'])

    for tag in iob_tags:
        if len(tag) == 0:
            tag.append('O')

    if tokenizer:
        tokens = tokenizer(tex, add_special_tokens=False)
        token_tags = align_tags_to_tokens(tokens, char_tags=iob_tags)
        return {'tags': token_tags, 'tex': tex, 'tokens': [tokenizer.convert_ids_to_tokens(i) for i in tokens['input_ids']]}

    return {'tags': iob_tags, 'tex': tex}

def align_tags_to_tokens(tokens: BatchEncoding, char_tags: list[list[str]]):
    aligned_tags = []
    for idx in range(len(tokens.input_ids)):
        span = tokens.token_to_chars(idx)
        if span is None:
            continue

        tags_for_token = list({tag for token_tags in char_tags[span.start:span.end] for tag in token_tags})
        if 'O' in tags_for_token and len(tags_for_token) > 1:
            tags_for_token.remove('O')
        aligned_tags.append(tags_for_token)
    return aligned_tags
