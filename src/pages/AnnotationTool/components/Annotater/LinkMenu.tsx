import React, { useEffect, useState } from "react";
import { Link, TextSpan } from "@/lib/span";
import { getViewerWidthInChars, jumpToPercent, shortenText } from "@/lib/utils";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import fuzzysort from "fuzzysort";
import {
  FormControlLabel,
  Button,
  TextField,
  Switch,
  Tooltip,
} from "@mui/material";
import { IconButton } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { partition } from "lodash";

type LinkMenuProps = {
  left: number;
  top: number;
  colors: any;
  selectedAnnotation: TextSpan;
  annotations: TextSpan[];
  toggleLink: (source: TextSpan, target: TextSpan) => any;
  onDeletePress: (e: any, anno: any) => any;
};

export function LinkMenu(props: LinkMenuProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);
  const [showAllAnnotations, setShowAnnotations] = useState<boolean>(false);
  // Auto show links if tag == reference and length of tag is at least 4
  const [showAutoLinks, setShowAutoLinks] = useState<boolean>(
    props.selectedAnnotation.text.length > 4 &&
    props.selectedAnnotation.tag == "reference",
  );
  const [otherFileAnnotations, setOtherFileAnnotations] = useState<TextSpan[]>(
    [],
  );
  const [autoLinkSuggestions, setAutoLinkSuggestions] = useState<TextSpan[]>(
    [],
  );
  const [query, setQuery] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterFileId, setFilterFileId] = useState("");

  /* Toggle states */
  const toggleExpandedIndex = (index: number) =>
    expandedIndex == index ? setExpandedIndex(-1) : setExpandedIndex(index);
  const toggleFileId = (fid: string) =>
    fid == filterFileId ? setFilterFileId("") : setFilterFileId(fid);
  const toggleTag = (tag: string) =>
    tag == filterTag ? setFilterTag("") : setFilterTag(tag);

  /* Jump to autolink definition */
  const handleJumpClick = (e: any, anno: any) => {
    window.open(
      `?userid=&fileid=${anno.file}&anchor=${anno.percent}`,
      "_blank",
    );
  };

  async function loadAllAnnotations() {
    try {
      const response = await fetch(`/api/annotations/all?fileid=${props.selectedAnnotation.fileid}`);
      const res = await response.json();
      setOtherFileAnnotations(res["otherAnnotations"]);
    } catch (e) {
      console.error(e);
    }
  }

  async function queryAutoLinks(text: string, fileid: string, topk: number = 5) {
    try {
      const width = getViewerWidthInChars();
      const response = await fetch(
        `/api/definition?query=${text}&fileid=${fileid}&topk=${topk}&width=${width}`,
        {
          mode: "cors",
        },
      );
      const res = await response.json();
      setAutoLinkSuggestions(res["results"]);
      console.log(res["results"]);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (showAllAnnotations) {
      loadAllAnnotations();
    }
    if (showAutoLinks) {
      queryAutoLinks(props.selectedAnnotation.text, showAllAnnotations ? "" : props.selectedAnnotation.fileid, 5);
    } else {
      setAutoLinkSuggestions([]);
    }
  }, [showAllAnnotations, showAutoLinks]);

  /* Full list of all annotations. If we're showing all annotations, include the ones from other files. */
  let allAnnos = [
    ...props.annotations,
    ...(showAllAnnotations ? otherFileAnnotations : []),
  ];
  allAnnos = allAnnos.filter((anno) => anno != props.selectedAnnotation);
  if (filterTag != "") {
    allAnnos = allAnnos.filter((anno) => anno.tag == filterTag);
  }
  if (filterFileId != "") {
    allAnnos = allAnnos.filter((anno) => anno.fileid == filterFileId);
  }

  /* Split by "linked" and "non-linked" */
  const [linkedAnnos, nonLinkedAnnos] = partition(allAnnos, (candidate) => {
    const anno = props.selectedAnnotation;
    const lookup = {
      start: candidate.start,
      end: candidate.end,
      tag: candidate.tag,
      fileid: candidate.fileid,
    };

    // Filter only links which are in the list
    return (
      anno.links.findIndex(
        (item) =>
          lookup.start == item.start &&
          lookup.end == item.end &&
          lookup.tag == item.tag &&
          lookup.fileid == item.fileid,
      ) != -1
    );
  });

  const filterSearch = (annotations: TextSpan[], query: string) => {
    return query.length == 0
      ? annotations
      : fuzzysort
        .go(query, annotations, { keys: ["text", "tag", "fileid"] })
        .map((t) => t.obj);
  };

  const highlightResult = (
    annotation: TextSpan,
    query: string,
    index: number,
  ) => {
    const text =
      expandedIndex == index
        ? annotation.text
        : annotation.text.slice(0, 50) + "...";
    if (query.length == 0) {
      return text;
    }

    const match = fuzzysort.single(query, text);
    if (match === null) {
      return text;
    }
    return fuzzysort.highlight(match, (m, i) => (
      <span
        key={crypto.randomUUID()}
        style={{ width: "60%", fontWeight: "bold", color: "red" }}
      >
        {m}
      </span>
    ));
  };

  const makeRow = (
    annotation: any,
    index: number,
    selected: boolean = false,
  ) => {
    let icon = selected ? <CloseIcon /> : <CheckIcon />;
    return (
      <tr
        key={crypto.randomUUID()}
        className={selected ? "link-menu-item link-selected" : "link-menu-item"}
      >
        <td>
          {" "}
          <IconButton
            size="small"
            onClick={(e) =>
              props.toggleLink(props.selectedAnnotation, annotation)
            }
          >
            {" "}
            {icon}{" "}
          </IconButton>
        </td>
        <td>
          {" "}
          <Button
            size="small"
            variant="text"
            onClick={(e) => toggleTag(annotation.tag)}
            style={{ color: props.colors[annotation.tag] }}
          >
            {" "}
            {`${annotation.tag}`}{" "}
          </Button>{" "}
        </td>
        <td>
          <Tooltip title={annotation.fileid}>
            <Button
              style={{ maxHeight: "50px", whiteSpace: "nowrap" }}
              size="small"
              variant="text"
              onClick={(e) => toggleFileId(annotation.fileid)}
            >
              {shortenText(annotation.fileid, 10, true)}
            </Button>
          </Tooltip>
        </td>
        <td
          onClick={(e) => toggleExpandedIndex(index)}
          className="expand-text"
          style={{ overflowX: "scroll", width: "80%" }}
        >
          <pre style={{ margin: "0px", whiteSpace: "pre-wrap" }}>
            {selected
              ? index == expandedIndex
                ? annotation.text
                : annotation.text.slice(0, 50) + "..."
              : highlightResult(annotation, query, index)}
          </pre>
        </td>
      </tr>
    );
  };
  const makeAutoLinkRow = (annotation: any, index: number) => {
    return (
      <tr key={crypto.randomUUID()} className={"link-menu-item link-auto-link"}>
        <td>
          <IconButton
            size="small"
            onClick={(e) => {
              handleJumpClick(e, annotation);
            }}
          >
            <OpenInNewIcon />
          </IconButton>
        </td>
        <td>
          <Typography style={{ color: "var(--transparent-dark)" }}>
            {"[unknown]"}
          </Typography>
        </td>
        <td>
          <Tooltip title={annotation.file}>
            <Button
              style={{ maxHeight: "50px", whiteSpace: "nowrap" }}
              size="small"
              variant="text"
            >
              {`${annotation.file.slice(0, 10) + "..."}`}
            </Button>
          </Tooltip>
        </td>
        <td
          onClick={(e) => toggleExpandedIndex(index)}
          className="expand-text"
          style={{ overflowX: "scroll", width: "80%" }}
        >
          <pre style={{ margin: "0px", whiteSpace: "pre-line" }}>
            {index == expandedIndex
              ? annotation.text
              : annotation.text.slice(0, 50) + "..."}
          </pre>
        </td>
      </tr>
    );
  };

  return (
    <div
      style={{ width: "100%", paddingLeft: "5px" }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Header */}
      <div>
        <TextField
          size="small"
          id="search-bar"
          label="Search"
          variant="outlined"
          onChange={(q) => setQuery(q.target.value)}
        />
        <FormControlLabel
          style={{ float: "left" }}
          control={
            <Switch
              checked={showAllAnnotations}
              onChange={() => {
                setShowAnnotations(!showAllAnnotations);
              }}
            />
          }
          label="Show other files"
        />
        <FormControlLabel
          style={{ float: "left" }}
          control={
            <Switch
              checked={showAutoLinks}
              onChange={() => {
                setShowAutoLinks(!showAutoLinks);
              }}
            />
          }
          label="Show autolinks"
        />
      </div>
      <Divider> </Divider>

      {/* Table content */}
      <table cellSpacing={0}>
        <thead>
          <tr>
            <th> Select </th>
            <th> Type </th>
            <th> File ID</th>
            <th> Text </th>
          </tr>
        </thead>
        <tbody>
          {autoLinkSuggestions.map((annotation, index) =>
            makeAutoLinkRow(annotation, index),
          )}
          {linkedAnnos.map((annotation, index) =>
            makeRow(annotation, index, true),
          )}
          {filterSearch(nonLinkedAnnos, query).map((annotation, index) =>
            makeRow(annotation, index + linkedAnnos.length, false),
          )}
        </tbody>
      </table>
    </div>
  );
}

export default LinkMenu;
