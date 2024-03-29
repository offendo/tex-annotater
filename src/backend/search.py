from functools import lru_cache
import os
import re
from pathlib import Path
from subprocess import PIPE, STDOUT, Popen
from tqdm import tqdm

import gdown
import numpy as np
import pandas as pd
import logging
from rapidfuzz import process, fuzz

from .data import list_all_textbooks, list_s3_documents, load_tex

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

patterns = [
    r"a \(\([a-z]* \)*\)is a",
    r"is called \([^ ]* \)*if",
    r"is called \([^ ]* \)*when",
    r"we call \([^ ]* \)*if",
    r"we define \([^ ]* \)*to be",
]


def download_books(output_dir: str):
    df = list_all_textbooks()
    for tex_url, name in zip(df["tex"], df["name"]):
        outputfile = Path(output_dir, name).with_suffix(".tex")
        if outputfile.exists():
            continue
        with open(outputfile, "wb") as f:
            tex_out = gdown.download(tex_url, f, quiet=True, fuzzy=True)

    return [str(Path(output_dir, name).with_suffix(".tex")) for name in df["name"]]


def download_texs(output_dir: str):
    names = list_s3_documents()
    for name in names:
        logger.debug('downloading ', name)
        outputfile = Path(output_dir, name).with_suffix(".tex")
        if outputfile.exists():
            continue
        try:
            tex = load_tex(name)
            with open(outputfile, "w") as f:
                f.write(tex)
        except:
            print("failed to get", name)
            continue

    return [str(Path(output_dir, name).with_suffix(".tex")) for name in names]


def extract_definitions(patterns: list[str], books: list[str]):
    """search"""
    p = Popen(
        ["wc", "-l", *[b for b in books]],
        stdout=PIPE,
        stderr=STDOUT,
    )
    line_counts = []
    for count in p.communicate()[0].decode().strip().split("\n"):
        match = re.match(r"^\s*(\d+)\s*(.*)$", count)
        if match is None:
            continue
        wc, file = match.groups()
        line_counts.append((str(Path(file).stem), int(wc)))

    count_df = pd.DataFrame.from_records(line_counts, columns=["file", "total_lines"])

    p = Popen(
        ["grep", "-oin", r"\|".join(patterns), *[b for b in books]],
        stdout=PIPE,
        stderr=STDOUT,
    )

    searched = []
    for match in p.communicate()[0].decode().strip().split("\n"):
        groups = re.match(r"(.*).tex:(\d+):(.*)", match)
        if groups is None:
            continue
        name, linenum, rest = groups.groups()
        searched.append((str(Path(name).stem), int(linenum), rest))

    df = pd.DataFrame.from_records(searched, columns=["file", "line", "text"])

    merged = pd.merge(df, count_df, left_on="file", right_on="file")
    merged["percent"] = merged["line"] / merged["total_lines"]
    merged["file"] = merged["file"] + ".tex"
    return merged


@lru_cache
def index_books(tex_dir: str, save_file: str):
    Path(tex_dir).mkdir(exist_ok=True, parents=True)
    books = download_books(tex_dir)
    texs = download_texs(tex_dir)
    df = extract_definitions(patterns, books + texs)
    df.to_csv(save_file, index=False)
    return df


def fuzzysearch(query: str, index: pd.DataFrame, topk: int = 5, fileid: str = ""):
    if fileid:
        new_index = index[index['file'] == fileid]
        assert isinstance(new_index, pd.DataFrame)
    else:
        new_index = index
    results = process.extract(
        query,
        new_index.to_dict(orient="records"),
        scorer=lambda a, b, **kwargs: fuzz.WRatio(a, b["text"], **kwargs),
        limit=topk,
    )
    return [match for match, score, dist in results]
