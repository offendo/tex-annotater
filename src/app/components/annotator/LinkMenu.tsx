import React, { useState } from "react";
import { Link, TextSpan } from "../../lib/span";
import fuzzysort from "fuzzysort"
import { FormControlLabel, Button, TextField, Switch } from "@mui/material";
import { IconButton } from "@mui/material";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

export interface LinkMenuProps {
    left: number;
    top: number;
    colors: any;
    selectedAnnotation: TextSpan;
    annotations: TextSpan[];
    otherFileAnnotations: TextSpan[];
    toggleLink: (source: TextSpan, target: TextSpan) => any;
    onDeletePress: (e: any, anno: any) => any
}

export function LinkMenu(props: LinkMenuProps) {
    const [expandedIndex, setExpandedIndex] = useState<number>(-1);
    const [showAllAnnotations, setShowAnnotations] = useState<boolean>(false);
    const [query, setQuery] = useState("");
    const [filterTag, setFilterTag] = useState("");
    const [filterFileId, setFilterFileId] = useState("");

    /* Toggle states */
    const toggleExpandedIndex = (index: number) => expandedIndex == index ? setExpandedIndex(-1) : setExpandedIndex(index);
    const toggleFileId = (fid: string) => fid == filterFileId ? setFilterFileId("") : setFilterFileId(fid);
    const toggleTag = (tag: string) => tag == filterTag ? setFilterTag("") : setFilterTag(tag);

    /* Partition in array given a predicate isValid */
    function partition<T>(array: T[], isValid: (x: T) => boolean) {
        return array.reduce(([pass, fail], elem) => {
            return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]];
        }, [[], []] as T[][]);
    }

    /* Full list of all annotations. If we're showing all annotations, include the ones from other files. */
    let allAnnos = [...props.annotations, ...(showAllAnnotations ? props.otherFileAnnotations : [])];
    allAnnos = allAnnos.filter((anno) => anno != props.selectedAnnotation);
    if (filterTag != "") {
        allAnnos = allAnnos.filter((anno) => anno.tag == filterTag);
    }
    if (filterFileId != "") {
        allAnnos = allAnnos.filter((anno) => anno.fileid == filterFileId);
    }
    console.log('all annos passed to link menu: ', allAnnos);

    /* Split by "linked" and "non-linked" */
    const [linkedAnnos, nonLinkedAnnos] = partition(allAnnos, (candidate) => {
        const anno = props.selectedAnnotation;
        const lookup = { start: candidate.start, end: candidate.end, tag: candidate.tag, fileid: candidate.fileid };

        // Filter only links which are in the list
        return anno.links.findIndex((item) => lookup.start == item.start && lookup.end == item.end && lookup.tag == item.tag && lookup.fileid == item.fileid) != -1;
    });


    const filterSearch = (annotations: TextSpan[], query: string) => {
        return query.length == 0 ? annotations : fuzzysort.go(query, annotations, { keys: ['text', 'tag', 'fileid'] }).map(t => t.obj);
    }

    const highlightResult = (annotation: TextSpan, query: string, index: number) => {
        const text = expandedIndex == index ? annotation.text : annotation.text.slice(0, 50) + '...';
        if (query.length == 0) {
            return text;
        }

        const match = fuzzysort.single(query, text)
        if (match === null) {
            return text;
        }
        return fuzzysort.highlight(match, (m, i) => <span key={crypto.randomUUID()} style={{ width: "60%", fontWeight: "bold", color: "red" }}>{m}</span>);
    }

    const makeRow = (annotation: any, index: number, selected: boolean = false) => {
        let icon = selected ? <CloseIcon /> : <CheckIcon />;
        console.log('annotation in row: ', annotation)
        return (
            <tr
                key={crypto.randomUUID()}
                className={selected ? "link-menu-item link-selected" : "link-menu-item"}
            >
                <td> <IconButton size="small" onClick={(e) => props.toggleLink(props.selectedAnnotation, annotation)}> {icon} </IconButton></td>
                <td> <Button size="small" variant="text" onClick={(e) => toggleTag(annotation.tag)} style={{ color: props.colors[annotation.tag] }}> {`${annotation.tag}`} </Button> </td>
                <td>
                    <Button
                        style={{ maxHeight: "50px", whiteSpace: "nowrap" }}
                        size="small"
                        variant="text"
                        onClick={(e) => toggleFileId(annotation.fileid)}
                    >
                        {`${annotation.fileid.slice(0, 10) + '...'}`}
                    </Button>
                </td>
                <td onClick={(e) => toggleExpandedIndex(index)} className="expand-text" style={{ overflowX: "scroll", width: "80%" }}>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                        {selected
                            ? (index == expandedIndex ? annotation.text : annotation.text.slice(0, 50) + '...')
                            : highlightResult(annotation, query, index)
                        }
                    </pre>
                </td>
            </tr>
        );
    }

    return (
        <div style={{ width: "100%" }} onClick={(e) => { e.stopPropagation() }}>
            {/* Header */}
            <div>
                <TextField style={{ width: "300px" }} size="small" id="search-bar" label="Search" variant="outlined" onChange={(q) => setQuery(q.target.value)} />
                <FormControlLabel style={{ float: "left" }} control={<Switch checked={showAllAnnotations} onChange={() => { setShowAnnotations(!showAllAnnotations); }} />} label="Show all annotations" />
            </div>
            <hr />

            {/* Table content */}
            <table >
                <thead>
                    <tr>
                        <th> Select </th>
                        <th> Type </th>
                        <th> File ID</th>
                        <th> Text </th>
                    </tr>
                </thead>
                <tbody>
                    {linkedAnnos.map((annotation, index) => makeRow(annotation, index, true))}
                    {filterSearch(nonLinkedAnnos, query).map((annotation, index) => makeRow(annotation, index, false))}
                </tbody>
            </table>
        </div>
    );
}
export default LinkMenu;
