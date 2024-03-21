import numpy as np
import pandas as pd
import re
import os
from subprocess import Popen, PIPE, STDOUT


def search_textbooks(grep: str, books: dict[str, str]):
    """search"""
    out = {}
    for name, content in books.items():
        p = Popen(
            [
                "grep",
                "-i",
                r"a \([a-z]* \)*is a\|is called \([^ ]* \)*if",
            ],
            stdout=PIPE,
            stdin=PIPE,
            stderr=STDOUT,
        )
        out[name] = (
            p.communicate(input=content.encode())[0].decode().strip().split("\n")
        )
    return out
