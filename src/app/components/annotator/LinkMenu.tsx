import React, { useState } from "react";
import { Link, TextSpan } from "../../lib/span";
import fuzzysort from "fuzzysort"
import { Checkbox, FormControlLabel, Button, TextField, Switch } from "@mui/material";
import { IconButton } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

export interface LinkMenuProps {
    left: number;
    top: number;
    colors: any;
    selectedAnnotation: TextSpan;
    annotations: TextSpan[];
    otherAnnotations: TextSpan[];
    onLinkSelectPress: (e: any, annotation: TextSpan, link: Link) => any;
    onMouseLeave: (e: any) => any
    onClosePress: (e: any) => any
    onDeletePress: (e: any, anno: any) => any
}

export function LinkMenu(props: LinkMenuProps) {
    const [selected, setSelected] = useState<number>(-1);
    const [showAllAnnotations, setShowAnnotations] = useState<boolean>(false);
    const [query, setQuery] = useState("");
    const [filterTag, setFilterTag] = useState("");
    const [filterFileId, setFilterFileId] = useState("");

    /* Toggle selected item */
    const toggleSelected = (index: number) => {
        if (selected == index) {
            setSelected(-1);
        } else {
            setSelected(index);
        }
    }
    const toggleFileId = (fid: string) => {
        // Deselect current fileid
        if (fid == filterFileId) {
            setFilterFileId("");
        } else { // Set new tag
            setFilterFileId(fid);
        }
    }

    const toggleTag = (tag: string) => {
        // Deselect current tag
        if (tag == filterTag) {
            setFilterTag("");
        } else { // Set new tag
            setFilterTag(tag);
        }
    }

    /* Partition in array given a predicate isValid */
    function partition<T>(array: T[], isValid: (x: T) => boolean) {
        return array.reduce(([pass, fail], elem) => {
            return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
        }, [[], []] as T[][]);
    }

    /* Full list of all annotations. If we're showing all annotations, include the ones from other files. */
    let all_annotations = [...props.annotations, ...(showAllAnnotations ? props.otherAnnotations : [])];
    all_annotations = all_annotations.filter((anno) => anno != props.selectedAnnotation);
    if (filterTag != "") {
        all_annotations = all_annotations.filter((anno) => anno.tag == filterTag);
    }
    if (filterFileId != "") {
        all_annotations = all_annotations.filter((anno) => anno.fileid == filterFileId);
    }


    /* Split by "linked" and "non-linked" */
    const [linked_annotations, non_linked_annotations] = partition(all_annotations, (candidate) => {
        const anno = props.selectedAnnotation;
        const lookup = { start: candidate.start, end: candidate.end, tag: candidate.tag, fileid: candidate.fileid };

        // Filter only links which are in the list
        return anno.links.findIndex((item) => lookup.start == item.start && lookup.end == item.end && lookup.tag == item.tag && lookup.fileid == item.fileid) != -1;
    });


    const filterSearch = (annotations: TextSpan[], query: string) => {
        return query.length == 0 ? annotations : fuzzysort.go(query, annotations, { keys: ['text', 'tag', 'fileid'] }).map(t => t.obj);
    }

    const highlightResult = (annotation: TextSpan, query: string, index: number) => {
        const text = selected == index ? annotation.text : annotation.text.slice(0, 50) + '...';
        if (query.length == 0) {
            return text;
        }

        const match = fuzzysort.single(query, text)
        if (match === null) {
            return text;
        }
        return fuzzysort.highlight(match, (m, i) => <span style={{ width: "60%", fontWeight: "bold", color: "red" }}>{m}</span>);
    }

    return (
        <div className="link-menu" style={{ top: props.top, left: props.left }}>
            <div >
                <IconButton style={{ float: "right" }} onClick={props.onClosePress}> <CloseIcon /> </IconButton>
                <FormControlLabel style={{ float: "left" }} control={<Switch checked={showAllAnnotations} onChange={() => { setShowAnnotations(!showAllAnnotations); }} />} label="Show all annotations" />
            </div>
            <TextField fullWidth size="small" id="search-bar" label="Search" variant="outlined" onChange={(q) => setQuery(q.target.value)} />
            <hr />
            <table style={{ overflowX: "scroll" }}>
                <thead>
                    <tr>
                        <th> Select </th>
                        <th> Type </th>
                        <th> File ID</th>
                        <th style={{ width: "100%" }}> Text </th>
                    </tr>
                </thead>
                <tbody>
                    {linked_annotations.map((annotation, index) => {
                        return (
                            <tr
                                key={`${index}-{annotation.tag}-{annotation.text}`}
                                className="link-menu-item link-selected"
                                style={{ width: "80%" }}
                            >

                                <td> <IconButton size="small" onClick={(e) => props.onLinkSelectPress(e, props.selectedAnnotation, annotation as Link)}> <CloseIcon /> </IconButton></td>
                                <td> <Button size="small" variant="text" onClick={(e) => toggleTag(annotation.tag)} style={{ color: props.colors[annotation.tag] }}> {`${annotation.tag}`} </Button> </td>
                                <td> <Button size="small" variant="text" onClick={(e) => toggleFileId(annotation.fileid)}> {`${annotation.fileid}`} </Button> </td>
                                <td onClick={(e) => toggleSelected(index)} className="expand-text" style={{ overflowX: "scroll", width: "80%" }}>
                                    <pre style={{ whiteSpace: "pre-wrap" }}>
                                        {index == selected ? annotation.text : annotation.text.slice(0, 50) + '...'}
                                    </pre>
                                </td>
                            </tr>
                        );
                    })}
                    {filterSearch(non_linked_annotations, query).map((annotation, index) => {
                        return (
                            <tr
                                key={`${index}-{annotation.tag}-{annotation.text}`}
                                className="link-menu-item"
                            >

                                <td> <IconButton size="small" onClick={(e) => props.onLinkSelectPress(e, props.selectedAnnotation, annotation as Link)}> <CheckIcon /> </IconButton></td>
                                <td> <Button size="small" variant="text" onClick={(e) => toggleTag(annotation.tag)} style={{ color: props.colors[annotation.tag] }}> {`${annotation.tag}`} </Button> </td>
                                <td> <Button size="small" variant="text" onClick={(e) => toggleFileId(annotation.fileid)}> {`${annotation.fileid}`} </Button> </td>
                                <td onClick={(e) => toggleSelected(index)} className="expand-text" style={{ overflowX: "scroll", width: "80%" }}>
                                    <pre style={{ whiteSpace: "pre-wrap" }}>
                                        {highlightResult(annotation, query, index)}
                                    </pre>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
export default LinkMenu;
