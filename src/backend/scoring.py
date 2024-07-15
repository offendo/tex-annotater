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

def diff(anno_a: list[tuple[int, int, str, str]], anno_b: list[tuple[int, int, str, str]]):
    anno_a = sorted(set(anno_a))
    anno_b = sorted(set(anno_b))

    both = sorted(anno_a + anno_b)

    strs = []
    for anno in both:
        if anno in anno_a and anno in anno_b:
            continue
        elif anno in anno_a:
            start, end, tag, text = anno
            strs.append(f'> ({tag}) {(text[:75] + '...') if len(text) > 75 else text}')
        elif anno in anno_b:
            start, end, tag, text = anno
            strs.append(f'< ({tag}) {(text[:75] + '...') if len(text) > 75 else text}')
    return strs

def score_and_diff(system: dict[str, list], reference: dict[str, list]):
    tags_sys = system['tags']
    tags_ref = reference['tags']
    scores = score_annotations(tags_sys, tags_ref)
    annos_sys = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in system['annotations']]
    annos_ref = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in reference['annotations']]
    diff_str = diff(annos_sys, annos_ref)
    return dict(**scores, diff_str=diff_str)
