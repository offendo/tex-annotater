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
from .wrapper import TextWrapperWithMap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

patterns = [
    r"an? \([^ ]* \)*is an?\s*",
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
        logger.debug("downloading ", name)
        outputfile = Path(output_dir, name).with_suffix(".tex")
        if outputfile.exists():
            continue
        try:
            tex = load_tex(name)
            with open(outputfile, "w") as f:
                f.write(tex)
        except:
            logger.error(f"failed to get {name}")
            continue

    return [str(Path(output_dir, name).with_suffix(".tex")) for name in names]


def build_definition_index(patterns: list[str], books: list[str]):
    """search"""

    searched = []
    for book in books:
        # Create definition index
        p = Popen(
            ["grep", "-oin", '"' + r"\|".join(patterns) + '"', book],
            stdout=PIPE,
            stderr=STDOUT,
        )
        for match in p.communicate()[0].decode().strip().split("\n"):
            groups = re.match(r"(\d+):(.*)", match)
            if groups is None:
                continue
            linenum, rest = groups.groups()
            searched.append((str(Path(book).stem), int(linenum), rest))

    df = pd.DataFrame.from_records(searched, columns=["file", "line", "text"])
    return df


@lru_cache(maxsize=100)
def reindex(book: str, width: int):
    """ Reindex a book's old lines to post-folding lines

    Parameters
    ----------
    book : string
    width : int

    Returns
    -------
    tuple :
        Tuple containing `old2new` (mapping between old/new line numbers) and `lines` (total line count of post-folding)
    """
    # Get total lines for book
    fold = Popen(
        ["fold", "-s", "-w", str(width), book],
        stdout=PIPE,
    )
    wc = Popen(
        ["wc", "-l"],
        stdin=fold.stdout,
        stdout=PIPE,
        stderr=STDOUT,
    )
    count = wc.communicate()[0].decode().strip()
    match = re.match(r"^\s*(\d+)\s*(.*)$", count)
    if match is None:
        raise Exception(f"Failed to count lines in file {book}")

    lines, file = match.groups()

    # Get mapping between old/new line numbers
    nl = Popen(
        ["nl", "-w2", "-s':::'", book],
        stdout=PIPE,
    )
    fold = Popen(
        ["fold", "-s", "-w", str(width)],
        stdin=nl.stdout,
        stdout=PIPE,
    )
    p = Popen(
        ["grep", "-oin", r"^\d\+:::"],
        stdin=fold.stdout,
        stdout=PIPE,
        stderr=STDOUT,
    )
    awk = Popen(
        ["awk", "-F':'" "'{print $2 \" \" $1}'"],
        stdin=p.stdout,
        stdout=PIPE,
        stderr=STDOUT,
    )
    old2new = dict(
        line.split() for line in awk.communicate()[0].decode().strip().split("\n")
    )
    return (old2new, lines)


@lru_cache(maxsize=30)
def index_books(tex_dir: str):
    save_file = Path(tex_dir, f"index.csv")
    if save_file.exists():
        return pd.read_csv(save_file)
    Path(tex_dir).mkdir(exist_ok=True, parents=True)
    books = download_books(tex_dir)
    texs = download_texs(tex_dir)
    df = build_definition_index(patterns, books + texs)
    df.to_csv(save_file, index=False)
    return df


def fuzzysearch(query: str, index: pd.DataFrame, topk: int = 5, fileid: str = ""):
    if fileid:
        new_index = index[index["file"] == fileid]
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
