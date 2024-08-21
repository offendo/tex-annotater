#!/usr/bin/env python3

from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.preprocessing import MultiLabelBinarizer
from transformers import BatchEncoding


def compute_annotation_score(sys: list[list[str]], ref: list[list[str]], tags: list[str]):
    assert len(sys) == len(ref), "System and reference must be the same length!"
    ref_no_prefix = [[r.replace('B-', '').replace('I-', '') for r in rs]  for rs in ref]
    sys_no_prefix = [[s.replace('B-', '').replace('I-', '') for s in ss]  for ss in sys]

    flat_ref = [r for rs in ref_no_prefix for r in rs]
    flat_sys = [s for ss in sys_no_prefix for s in ss]
    # Classes should be at most tags, but we want to only count the ones that have been actually annotated (otherwise scores will be weird)
    classes = list(set(tags).intersection(set(flat_ref).union(set(flat_sys))))
    mlb = MultiLabelBinarizer(classes=classes)
    ref_bin = mlb.fit_transform(ref_no_prefix)
    sys_bin = mlb.transform(sys_no_prefix)

    return {
        "f1": f1_score(ref_bin, sys_bin, average="macro", zero_division=0),
        "precision": precision_score(ref_bin, sys_bin, average="macro", zero_division=0),
        "recall": recall_score(ref_bin, sys_bin, average="macro", zero_division=0),
    }

def compute_textual_diff(anno_a: list[tuple[int, int, str, str]], anno_b: list[tuple[int, int, str, str]], tags: list[str]):
    anno_a = sorted(set(map(tuple, anno_a)))
    anno_b = sorted(set(map(tuple, anno_b)))

    both = sorted(anno_a + anno_b)

    strs = []
    for anno in both:
        if anno in anno_a and anno in anno_b:
            continue
        elif anno in anno_a:
            start, end, tag, text = anno
            if tag not in tags:
                continue
            text = text.replace('\n', '\\\\')
            strs.append(f'+ ({tag}:{start})||| {(text[:75] + '...') if len(text) > 75 else text}')
        elif anno in anno_b:
            start, end, tag, text = anno
            if tag not in tags:
                continue
            text = text.replace('\n', '\\\\')
            strs.append(f'- ({tag}:{start})||| {(text[:75] + '...') if len(text) > 75 else text}')
    return strs

def compute_score_and_diff(system: dict[str, list], reference: dict[str, list], tags: list[str]):
    # Get f1 score
    tags_sys = [tag for text, tag in system['iob_tags']]
    tags_ref = [tag for text, tag in reference['iob_tags']]
    scores = compute_annotation_score(tags_sys, tags_ref, tags)

    # Get diff string
    annos_sys = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in system['annotations']]
    annos_ref = [(anno['start'], anno['end'], anno['tag'], anno['text']) for anno in reference['annotations']]
    diff_str_list = compute_textual_diff(annos_sys, annos_ref, tags)

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


def align_annotations_to_tokens(tokens: BatchEncoding, char_tags: list[list[str]]) -> list[list[str]]:
    """Converts character-level annotations to token-level

    Parameters
    ----------
    tokens : BatchEncoding
        Output of a huggingface tokenizer on text
    char_tags : list[list[str]]
        Character-level tags (list of tags per character)

    Returns
    -------
    list[list[str]]
        Token-level tags (list of tags per token)
    """

    aligned_tags: list[list[str]] = []
    for idx in range(len(tokens.input_ids)):
        span = tokens.token_to_chars(idx)
        if span is None:
            continue

        tags_for_token = list({tag for token_tags in char_tags[span.start : span.end] for tag in token_tags})
        if "O" in tags_for_token and len(tags_for_token) > 1:
            tags_for_token.remove("O")

        # Ensure that we only have B- or I- but not both
        for tag in tags_for_token:
            b = tag.replace("I-", "B-")
            i = tag.replace("B-", "I-")
            if b in tags_for_token and i in tags_for_token:
                tags_for_token.remove(i)
        aligned_tags.append(tags_for_token)
    return aligned_tags



def find_annos_at_index(annos: list[dict], index: int) -> set[tuple[int, int, str]]:
    """Finds annotations which overlap with a given character index

    Parameters
    ----------
    annos : list[dict]
        List of annotations to search through
    index : int
        Character index to consider

    Returns
    -------
    set[tuple[int, int, str]]
        Set of (start, end, tag) tuples which overlap with the index
    """

    result = set()
    for anno in annos:
        start = anno["start"]
        end = anno["end"]
        tag = anno["tag"]
        if start <= index <= end:
            result.add((start, end, tag))
    return result


def compute_annotation_diff(tex: str, annos_list: list[list[dict]], tags: list[str], start: int, end: int) -> list[list[dict]]:
    """Computes a diff between a list of annotation sets

    Given a list of annotation sets `annos_list` and a set of tags to compare `tags`, filter out
    every annotation which appears in all sets.

    Parameters
    ----------
    tex : str
        File which the annotations are for
    annos_list : list[list[dict]]
        List of annotation sets
    tags : list[str]
        List of tags to compare
    start : int
        Character start index for file
    end : int
        Character end index for file

    Returns
    -------
    list[list[dict]]
        A filtered version of `annos_list` containing annotations which don't appear in every annotation set.
    """

    N = len(annos_list)
    tex = tex[start : end + 1]

    # Initialize the diffs, empty list for each character index
    annos_at_index = [[set() for _ in tex] for _ in annos_list]
    diffs = [set() for _ in annos_list]

    # for each character, add all the annotations that exist at that index
    for idx, char in enumerate(tex):
        for anno_idx, annos in enumerate(annos_list):
            annos_at_index[anno_idx][idx] = find_annos_at_index(annos, idx + start)

        # now compute the diffs
        intersection = set.intersection(*(annos_at_index[i][idx] for i in range(N)))
        for a in range(N):
            # only add diffs for those things that are in the tags
            annos = [i for i in annos_at_index[a][idx].difference(intersection) if i[-1] in tags]
            diffs[a].update(annos)

    # Return a list of annotations which are part of the diff
    return [[a for a in annos_list[idx] if (a["start"], a["end"], a["tag"]) in d] for idx, d in enumerate(diffs)]
