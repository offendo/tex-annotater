#!/usr/bin/env python3

from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.preprocessing import MultiLabelBinarizer


def score_annotations(sys: list[list[str]], ref: list[list[str]]):
    assert len(sys) == len(ref), "System and reference must be the same length!"
    mlb = MultiLabelBinarizer(classes=["definition", "theorem", "name", "reference", "example", "proof"])
    ref_bin = mlb.fit_transform(ref)
    sys_bin = mlb.transform(sys)

    return {
        "f1": f1_score(ref_bin, sys_bin, average="macro"),
        "precision": precision_score(ref_bin, sys_bin, average="macro"),
        "recall": recall_score(ref_bin, sys_bin, average="macro"),
    }

def print_diff(anno_a: list[tuple[int, int, str, str]], anno_b: list[tuple[int, int, str, str]]):
    anno_a = sorted(set(anno_a))
    anno_b = sorted(set(anno_b))

    both = sorted(anno_a + anno_b)

    for anno in both:
        if anno in anno_a and anno in anno_b:
            continue
        elif anno in anno_a:
            start, end, tag, text = anno
            print(f'> ({tag}) {(text[:75] + '...') if len(text) > 75 else text}')
        elif anno in anno_b:
            start, end, tag, text = anno
            print(f'< ({tag}) {(text[:75] + '...') if len(text) > 75 else text}')
