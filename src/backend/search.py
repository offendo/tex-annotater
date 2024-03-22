from functools import lru_cache
import os
import re
from pathlib import Path
from subprocess import PIPE, STDOUT, Popen
from tqdm import tqdm

import gdown
import numpy as np
import pandas as pd
from rapidfuzz import process, fuzz

from .data import list_all_textbooks

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
        with open(Path(output_dir, name).with_suffix(".tex"), "wb") as f:
            tex_out = gdown.download(tex_url, f, quiet=True, fuzzy=True)

    return [str(Path(output_dir, name).with_suffix(".tex")) for name in df["name"]]


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
    return merged


@lru_cache
def index_books(textbook_dir: str, save_file: str):
    Path(textbook_dir).mkdir(exist_ok=True, parents=True)
    books = download_books(textbook_dir)
    df = extract_definitions(patterns, books)
    df.to_csv(save_file, index=False)
    return df


def fuzzysearch(query: str, index: pd.DataFrame, top_k: int = 5):
    results = process.extract(
        query,
        index.to_dict(orient="records"),
        scorer=lambda a, b, **kwargs: fuzz.WRatio(a, b["text"], **kwargs),
        limit=top_k,
    )
    return [match for match, score, dist in results]
