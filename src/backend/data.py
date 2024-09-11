#!/usr/bin/env python3
from collections import defaultdict
import logging
from typing import Optional

import pandas as pd
import psycopg
import randomname
from pprint import pprint
from psycopg.rows import dict_row
from transformers import AutoTokenizer, PreTrainedTokenizer

from .data_utils import CONN_STR, load_tex, parse_timestamp, query_db, list_s3_documents
from .scoring import align_annotations_to_tokens, compute_annotation_score

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()


def load_anno_from_annoid(annoid: str):
    query = """SELECT * FROM annotations WHERE annoid = %(annoid)s;"""
    params = dict(annoid=annoid)
    return query_db(query, params)[0]


def load_save_info_from_timestamp(timestamp: str):
    query = """SELECT * FROM saves WHERE "timestamp" = %(timestamp)s;"""
    parsed = parse_timestamp(timestamp)
    params = dict(timestamp=parsed)
    return query_db(query, params)[0]


def load_saves(fileid=None, userid=None, final=None):
    """Loads all the annotation save files for a particular file and/or user"""

    conditions = ["s.deleted = 0"]
    params = {}

    if fileid:
        conditions.append("a.fileid = %(fileid)s")
        params = dict(fileid=fileid)

    if userid:
        conditions.append("a.userid = %(userid)s")
        params["userid"] = userid

    if final:
        conditions.append("s.final = %(final)s")
        params["final"] = int(final)

    query = (
        """SELECT a.userid, a.fileid, a.timestamp, a.savename, a.autosave, s.final, s.start, s.end, COUNT(*) AS count
           FROM annotations a
           LEFT JOIN saves s
             ON a.fileid = s.fileid AND a.userid = s.userid AND a.timestamp = s.timestamp AND a.savename = s.savename
           WHERE """
        + " AND ".join(conditions)
        + " GROUP BY a.userid, a.fileid, a.timestamp, a.savename, a.autosave, s.final, s.start, s.end"
        + " ORDER BY a.timestamp DESC;"
    )
    return query_db(query, params)


def get_initial_user_from_savename(savename: str):
    query = """SELECT userid, timestamp FROM saves WHERE savename = %(savename)s ORDER BY timestamp LIMIT 1;"""
    return query_db(query, dict(savename=savename))[0]


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


def load_annotations(fileid, userid, timestamp=None, add_timestamp_to_ids: bool = False):
    # use most recent save by default
    if not timestamp:
        result = query_db(
            """SELECT MAX("timestamp") FROM annotations WHERE fileid = %(fileid)s AND userid = %(userid)s;""",
            params=dict(fileid=fileid, userid=userid),
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
    params = dict(fileid=fileid, userid=userid, timestamp=parsed)

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
        grouped["annoid"] = timestamp + grouped["annoid"]

        def _update_link_with_timestamp(links):
            result = []
            for link in links:
                new = {}
                for key, val in link.items():
                    if key == "source" or key == "target":
                        new[key] = timestamp + val
                    else:
                        new[key] = val
                result.append(new)
            return result

        grouped["links"] = grouped["links"].apply(lambda links: _update_link_with_timestamp(links))
    return grouped.to_dict(orient="records")


def insert_annotations(fileid, userid, annotations, autosave: int = 0, savename: str | None = None):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        if not savename:
            savename = randomname.get_name()

        # Delete autosaves if we're about to overwrite.
        if autosave:
            conn.execute(
                """
                DELETE FROM annotations WHERE fileid = %(fileid)s AND userid = %(userid)s AND savename = %(savename)s AND autosave = %(autosave)s;
                """,
                dict(savename=savename, autosave=int(autosave), fileid=fileid, userid=userid),
            )
            conn.execute(
                """
                DELETE FROM saves WHERE fileid = %(fileid)s AND userid = %(userid)s AND savename = %(savename)s AND autosave = %(autosave)s;
                """,
                dict(savename=savename, autosave=int(autosave), fileid=fileid, userid=userid),
            )

        # Create save if needed
        start = [a["start"] for a in annotations if a["tag"] == "begin annotation"][0]
        end = [a["end"] for a in annotations if a["tag"] == "end annotation"][0]

        conn.execute(
            """
            INSERT INTO saves (start, "end", fileid, userid, savename, final, autosave)
                VALUES (%(start)s, %(end)s, %(fileid)s, %(userid)s, %(savename)s, %(final)s, %(autosave)s)
            ON CONFLICT(fileid, userid, savename, autosave, "timestamp") DO NOTHING;
            """,
            dict(
                start=start, end=end, fileid=fileid, userid=userid, savename=savename, autosave=int(autosave), final=0
            ),
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
                    fileid=fileid,
                    userid=userid,
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
                        userid=userid,
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
        return {"timestamp": stamp, "savename": savename, "fileid": fileid, "userid": userid}


def delete_save(fileid, userid, savename, timestamp):
    with psycopg.connect(CONN_STR, row_factory=dict_row) as conn:
        parsed = parse_timestamp(timestamp)
        conn.execute(
            """
            UPDATE saves
              SET deleted = 1
            WHERE fileid = %(fileid)s
              AND userid = %(userid)s
              AND savename = %(savename)s
              AND "timestamp" = %(timestamp)s;
            """,
            dict(savename=savename, timestamp=parsed, fileid=fileid, userid=userid),
        )


def finalize_save(fileid, userid, savename, timestamp):
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
            dict(savename=savename, fileid=fileid, userid=userid, timestamp=parsed),
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
                start INTEGER,
                "end" INTEGER,
                fileid TEXT,
                userid TEXT,
                final INTEGER,
                autosave INTEGER,
                deleted INTEGER DEFAULT 0,
                "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (savename, fileid, userid, autosave, "timestamp")
            );
        """
        )


def export_annotations(
    fileid,
    userid,
    timestamp: Optional[str] = None,
    export_whole_file: bool = False,
    tokenizer: Optional[PreTrainedTokenizer] = None,
    begin: Optional[dict] = None,
    end: Optional[dict] = None,
):
    # annotations is a list of dicts, each containing an annotation. We want to format this into an IOB tagged block of text.
    annotations = load_annotations(fileid, userid, timestamp)
    tex = load_tex(fileid)

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
            if (char_idx - offset) < len(iob_tags):
                iob_tags[char_idx - offset].append(prefix + anno["tag"])
            # iob_tags[char_idx - offset].append(anno["tag"])

    for tag in iob_tags:
        if len(tag) == 0:
            tag.append("O")

    if tokenizer:
        tokens = tokenizer(tex, add_special_tokens=False)
        token_tags = align_annotations_to_tokens(tokens, char_tags=iob_tags)

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


def load_dashboard_data(tags: list[str]):
    # Load all final saves
    finals = load_saves(final=True)
    df = pd.DataFrame.from_records(finals)
    df["initial_user"] = df["savename"].apply(lambda item: get_initial_user_from_savename(item)["userid"])

    # Export all the final annotations
    annos = [export_annotations(save.fileid, save.userid, timestamp=save.timestamp) for idx, save in df.iterrows()]
    df["annotations"] = annos

    # Now, group by the key (fileid, start, end) and grab the user and annotations
    save_ids = df.groupby(["fileid", "start", "end"])[["initial_user", "annotations"]].agg(list)
    save_ids.loc["f1"] = [[] for _ in range(len(save_ids))]
    for saveid, row in save_ids.iterrows():
        # For each user, grab their reference save files and compute the F1
        for userid in row.userid:
            refs = [anno for user, anno in zip(row.userid, row.annotations) if user != userid]
            sys = [anno for user, anno in zip(row.userid, row.annotations) if user == userid][0]
            tags_sys = [tag for text, tag in sys["iob_tags"]]

            scores = []
            for ref in refs:
                tags_ref = [tag for text, tag in ref["iob_tags"]]
                scores.append(compute_annotation_score(tags_sys, tags_ref, tags)["f1"])
            user_avg_f1 = sum(scores) / len(scores) if len(scores) else None
            save_ids.loc[saveid, "f1"].append(user_avg_f1)

    return save_ids[["userid", "f1"]]
