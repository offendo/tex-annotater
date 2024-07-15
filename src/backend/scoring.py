#!/usr/bin/env python3

from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.preprocessing import MultiLabelBinarizer


def score_annotations(sys: list[list[str]], ref: list[list[str]]):
    assert len(sys) == len(ref), "System and reference must be the same length!"
    mlb = MultiLabelBinarizer(classes=["definition", "theorem", "name", "reference", "example", "proof"])
    ref_bin = mlb.fit_transform(ref)
    sys_bin = mlb.transform(sys)

    return {
        "f1": f1_score(ref_bin, sys_bin, average="macro", zero_division=1),
        "precision": precision_score(ref_bin, sys_bin, average="macro", zero_division=1),
        "recall": recall_score(ref_bin, sys_bin, average="macro", zero_division=1),
    }

def diff(anno_a: list[tuple[int, int, str, str]], anno_b: list[tuple[int, int, str, str]]):
    anno_a = sorted(set(map(tuple, anno_a)))
    anno_b = sorted(set(map(tuple, anno_b)))

    both = sorted(anno_a + anno_b)

    strs = []
    for anno in both:
        if anno in anno_a and anno in anno_b:
            continue
        elif anno in anno_a:
            start, end, tag, text = anno
            strs.append(f'+ ({tag}:{start})||| {(text[:75] + '...') if len(text) > 75 else text}')
        elif anno in anno_b:
            start, end, tag, text = anno
            strs.append(f'- ({tag}:{start})||| {(text[:75] + '...') if len(text) > 75 else text}')
    return strs

def score_and_diff(system: dict[str, list], reference: dict[str, list]):
    # Get f1 score
    tags_sys = [tag for text, tag in system['iob_tags']]
    tags_ref = [tag for text, tag in reference['iob_tags']]
    scores = score_annotations(tags_sys, tags_ref)

    # Get diff string
    annos_sys = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in system['annotations']]
    annos_ref = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in reference['annotations']]
    diff_str_list = diff(annos_sys, annos_ref)

    if len(diff_str_list) > 0:
        sep = '|||'
        justify_width = max([e.index(sep) for e in diff_str_list])
        diff_str_list = [e[0] + e.split(sep)[0][1:].rjust(justify_width) + e.split(sep)[1] for e in diff_str_list]

    # return dict(**scores, diff_str='\n'.join(diff_str_list), num_tokens=len(tags_ref), num_tags=len(reference['annotations']))
    return f"""F1: {scores['f1']}
Precision: {scores['precision']}
Recall: {scores['recall']}
#Tokens: {len(tags_ref)}
#Tags in system: {len(system['annotations'])}
#Tags in reference: {len(reference['annotations'])}

Diff string:
{'\n'.join(diff_str_list)}"""
