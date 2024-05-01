from functools import lru_cache
import os
import re
from pathlib import Path
from subprocess import PIPE, STDOUT, Popen
import subprocess
from tqdm import tqdm

import gdown
import numpy as np
import pandas as pd
import logging
from rapidfuzz import process, fuzz
from rapidfuzz.distance.LCSseq import normalized_distance, normalized_similarity

from .data import list_all_textbooks, list_s3_documents, load_tex

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

patterns = [
    r"an\? \([^ ]* \)*is an\? ",
    r"an\? \([^ ]* \)*is an\? \([^ ]* \)*if",
    r"the \([^ ]* \)*is an\? ",
    r"the \([^ ]* \)*is the ",
    r"is called \([^ ]* \)*if",
    r"is called \([^ ]* \)*when",
    r"is called an\? \([^ ]* \)*",
    r"we call \([^ ]* \)*if",
    r"we call \([^ ]* \)*the \([^ ]* \)if",
    r"we call \([^ ]* \)*the \([^ ]* \)when",
    r"we call \([^ ]* \)*an\? \([^ ]* \)if",
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


def download_papers(output_dir: str):
    names = [x['name'] for x in list_s3_documents()]
    for name in names:
        outputfile = Path(output_dir, name).with_suffix(".tex")
        if outputfile.exists():
            continue
        try:
            logger.info(f"downloading {name}")
            tex = load_tex(name)
            with open(outputfile, "w") as f:
                f.write(tex)
        except:
            logger.error(f"failed to get {name}")
            continue

    return [str(Path(output_dir, name).with_suffix(".tex")) for name in names]


def index_tex(patterns: tuple[str, ...], tex: str, type: str):
    p = Popen(
        ["grep", "-oin", r"\|".join(patterns), tex],
        stdout=PIPE,
        stderr=STDOUT,
    )
    searched = []
    for match in p.communicate()[0].decode().strip().split("\n"):
        groups = re.match(r"(\d+):(.*)", match)
        if groups is None:
            continue
        linenum, rest = groups.groups()
        searched.append((tex, type, int(linenum), rest))

    return searched

def build_definition_index(patterns: list[str], books: list[str], papers: list[str]):
    """Grep

    Greps through all the `books` using `patterns` and saves the result as a csv

    Parameters
    ----------
    patterns : list[str]
        A list of patterns to pass to grep, to be or'd together
    books : list[str]
        A list of paths to books to search through

    Returns
    -------
    pd.DataFrame :
        DataFrame with columns `[file, type, line, text]`
    """

    searched = []
    for book in books:
        # Create definition index
        searched.extend(index_tex(tuple(patterns), book, 'book'))
    for paper in papers:
        # Create definition index
        searched.extend(index_tex(tuple(patterns), paper, 'paper'))

    df = pd.DataFrame.from_records(searched, columns=["file", "type", "line", "text"])
    return df


@lru_cache(maxsize=100)
def compute_fold_mapping(book: str, width: int):
    """Reindex a book's old lines to post-folding lines

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
    lines = int(wc.communicate()[0].decode().strip())

    # Get mapping between old/new line numbers
    nl = Popen(
        ["nl", "-ba", "-w2", "-s", ":::", book],
        stdout=PIPE,
        stderr=STDOUT,
    )
    fold = Popen(
        ["fold", "-s", "-w", str(width)],
        stdin=nl.stdout,
        stdout=PIPE,
        stderr=STDOUT,
    )
    cmd = ["grep", "-oin", r"^[0-9]\+:::"]

    fold_out = fold.communicate()[0]
    grep_out = subprocess.check_output(
        cmd,
        input=fold_out,
        # stdout=PIPE,
        stderr=STDOUT,
    ).decode()

    old2new = {}
    for line in grep_out.splitlines():
        new, old, *_ = line.split(":")
        old2new[int(old)] = int(new)
    return (old2new, lines)


def download_and_index_tex(tex_dir: str, extraPatterns: list[str]):
    uniq = hash(','.join(extraPatterns))
    save_file = Path(tex_dir, f"index.{uniq}.csv")
    if save_file.exists():
        logger.info(f"Found cache: loading from index.{uniq}.csv")
        return pd.read_csv(save_file)
    logger.info("Cache miss, need to re-index...")
    Path(tex_dir).mkdir(exist_ok=True, parents=True)
    books = download_books(tex_dir)
    papers = download_papers(tex_dir)
    # df = build_definition_index(patterns + extraPatterns, books, papers)
    df = build_definition_index(extraPatterns, books, papers)
    logger.info(f"Re-indexed, found {len(df)} patterns")
    df.to_csv(save_file, index=False)
    return df


def scorer(query, match, **kwargs):
    mod_queries = [
        f"a {query} is a",
        f"an {query} is a",
        f"the {query} is",
        f"we call a {query}",
        f"we define a {query} to be",
    ]
    return max([fuzz.WRatio(pat, match, **kwargs) for pat in mod_queries])


def fuzzysearch(query: str, index: pd.DataFrame, topk: int = 20, fileid: str = ""):
    if fileid:
        new_index = index[index["file"].apply(lambda x: str(Path(x).name)) == fileid]
        assert isinstance(new_index, pd.DataFrame)
    else:
        new_index = index[index["type"] == "book"]

    # Force the query text to be in the
    new_index = new_index[new_index["text"].apply(lambda x: query.strip().lower() in x.lower())]  # type:ignore

    results = process.extract(
        query.strip(),
        new_index.to_dict(orient="records"),  # type:ignore
        scorer=lambda a, b, **kwargs: fuzz.partial_token_set_ratio(a, b["text"], **kwargs),
        limit=topk,
    )
    return [match for match, score, dist in results]
