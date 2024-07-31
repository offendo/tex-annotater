import React, { useEffect, useState, useContext } from "react";
import { Link, TextSpan } from "@/lib/span";
import { getViewerWidthInChars, jumpToPercent, shortenText } from "@/lib/utils";
import Typography from "@mui/material/Typography";
import fuzzysort from "fuzzysort";
import {
  FormControlLabel,
  Button,
  TextField,
  Switch,
  Tooltip,
  Input,
  Grid,
  Box,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { IconButton } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { partition, sortBy } from "lodash";
import { GlobalState, Status, toggleLink } from "@/lib/GlobalState";
import usePatterns from "@/lib/Patterns";

type LinkMenuProps = {
  selectedAnnotation: TextSpan;
};

export function LinkMenu(props: LinkMenuProps) {
  const theme = useTheme()
  const state = useContext(GlobalState);
  const [expandedIndex, setExpandedIndex] = useState<number>(-1);

  // Auto show links if tag == reference and length of tag is at least 4
  const [linkedAnnos, setLinkedAnnos] = useState<TextSpan[]>([]);
  const [nonLinkedAnnos, setNonLinkedAnnos] = useState<TextSpan[]>([]);
  const [autoLinkSuggestions, setAutoLinkSuggestions] = useState<TextSpan[]>([]);
  const [query, setQuery] = useState("");
  const [autolinkQuery, setAutolinkQuery] = useState(props.selectedAnnotation.text);
  const [filterTag, setFilterTag] = useState("");
  const [filterFileId, setFilterFileId] = useState("");

  const { regexPatterns, setRegexPatterns } = usePatterns();
  const { patterns, selectedPatterns } = regexPatterns;

  /* Toggle states */
  const toggleExpandedIndex = (index: number) =>
    expandedIndex == index ? setExpandedIndex(-1) : setExpandedIndex(index);
  const toggleFileId = (fid: string) =>
    fid == filterFileId ? setFilterFileId("") : setFilterFileId(fid);
  const toggleTag = (tag: string) =>
    tag == filterTag ? setFilterTag("") : setFilterTag(tag);

  /* Jump to autolink definition */
  const handlePercentJumpClick = (e: any, anno: any) => {
    window.open(
      `?userid=&fileid=${anno.file}&anchor=${anno.percent}`,
      "_blank",
    );
  };

  const handleAnnoJumpClick = (e: any, anno: any) => {
    window.open(
      `?userid=&fileid=${anno.fileid}&anchor=${anno.annoid}`,
      "_blank",
    );
  };

  const processAnnos = (annos: TextSpan[]) => {
    let annos_processed = annos.filter((anno) => anno != props.selectedAnnotation);
    if (filterTag != "") {
      annos_processed = annos_processed.filter((anno) => anno.tag == filterTag);
    }
    if (filterFileId != "") {
      annos_processed = annos_processed.filter((anno) => anno.fileid == filterFileId);
    }

    annos_processed = sortBy(annos_processed, (anno) => {
      const mp1 = anno.start + (anno.start - anno.end) / 2;
      const mp2 = props.selectedAnnotation.start + (props.selectedAnnotation.start - props.selectedAnnotation.end) / 2;

      const dist = Math.abs(mp1 - mp2)

      // 1. prioritize current file
      if (anno.fileid != props.selectedAnnotation.fileid) {
        return 1e12 + dist;
      }

      // 2. prioritize names
      if (anno.tag != "name") {
        return 1e10 + dist;
      }

      return dist;
    })

    /* Split by "linked" and "non-linked" */
    const both = partition(annos_processed, (candidate) => {
      const anno = props.selectedAnnotation;
      const lookup = {
        source: candidate.annoid,
      };

      // Filter only links which are in the list
      return (
        anno.links.findIndex(
          (item) =>
            lookup.source == item.target
        ) != -1
      );
    });

    return both;
  }

  async function loadAllAnnotations() {
    const response = await fetch(`/api/annotations/all?fileid=${props.selectedAnnotation.fileid}`);
    const res = await response.json();
    const otherAnnos = res["otherAnnotations"];
    return otherAnnos;
  }

  async function showAllAnnotations() {
    try {
      const otherAnnos = await loadAllAnnotations();
      const [linked, non] = processAnnos([...state.annotations, ...otherAnnos]);
      setLinkedAnnos(linked)
      setNonLinkedAnnos(non)
    } catch (e) {
      console.error(e);
    }
  }
  async function showThisFileAnnotations() {
    try {
      const [linked, non] = processAnnos(state.annotations);
      setLinkedAnnos(linked)
      setNonLinkedAnnos(non)
    } catch (e) {
      console.error(e);
    }
  }
  useEffect(() => {
    if (state.showAllAnnotations) {
      showAllAnnotations();
    } else {
      showThisFileAnnotations();
    }
  }, [state.showAllAnnotations, filterFileId, filterTag])

  async function queryAutoLinks(text: string, fileid: string, topk: number = 20, extraPatterns: string[] = []) {
    try {
      if (state.status == Status.WaitingForAutoLinks) {
        console.log('already waiting for autolinks - no need to re-fetch');
        return;
      }
      state.status = Status.WaitingForAutoLinks;
      console.log('Querying auto-links...')
      const width = getViewerWidthInChars();
      const response = await fetch(
        `/api/definition?query=${encodeURIComponent(text)}&fileid=${fileid}&topk=${topk}&width=${width}&extraPatterns=${encodeURIComponent(JSON.stringify(extraPatterns))}`
      );
      const res = await response.json();
      setAutoLinkSuggestions(res["results"]);
      state.status = Status.Ready;
      setAutolinkQuery(text);
    } catch (e) {
      state.status = Status.Error;
      console.error(e);
    }
  }
  /* Full list of all annotations. If we're showing all annotations, include the ones from other files. */
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
          <IconButton
            size="small"
            onClick={(e) => toggleLink(state, props.selectedAnnotation, annotation)}
          >
            {icon}
          </IconButton>
        </td>
        <td>
          <IconButton
            size="small"
            onClick={(e) => {
              handleAnnoJumpClick(e, annotation);
            }}
          >
            <OpenInNewIcon />
          </IconButton>
        </td>
        <td>
          {" "}
          <Button
            size="small"
            variant="text"
            onClick={(e) => toggleTag(annotation.tag)}
            style={{ color: state.colors[annotation.tag] }}
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
              handlePercentJumpClick(e, annotation);
            }}
          >
            <OpenInNewIcon />
          </IconButton>
        </td>
        <td>
          <Typography style={{ color: "var(--transparent-dark)" }}>
            {""}
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
            {highlightResult(annotation, query, index)}
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
      <Grid container rowSpacing={1}>
        <Grid item xs={4}>
          <FormControlLabel
            control={
              <Switch
                checked={state.showAllAnnotations}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  if (event.target.checked) {
                    state.setShowAllAnnotations(true)
                  } else {
                    state.setShowAllAnnotations(false);
                  }
                }}
              />
            }
            label="Show other files"
          />
        </Grid>
        <Grid item xs={8}>
          <TextField
            size="small"
            variant="outlined"
            id="search-bar"
            label="Search"
            onChange={(q) => setQuery(q.target.value)}
          />
        </Grid>
        <Grid item xs={4} style={{ alignContent: "center" }}>
          <Button
            size="small"
            variant="text"
            startIcon={<AutoAwesomeIcon />}
            onClick={(event) => {
              // setShowAutoLinks(true);
              queryAutoLinks(
                autolinkQuery,
                state.showAllAnnotations ? "" : props.selectedAnnotation.fileid,
                20,
                patterns.filter((pat: string) => selectedPatterns.indexOf(pat) !== -1) // send along extra patterns
              );
            }}
          >
            {"Run Autolinker"}
          </Button>
        </Grid>
        <Grid item xs={8}>
          <TextField
            variant="outlined"
            size="small"
            id="autolink-search-bar"
            placeholder="Autolink Query"
            label="Autolink Query"
            defaultValue={autolinkQuery}
            style={{ marginTop: "5px" }}
            onChange={(q) => {
              setAutolinkQuery(q.target.value)
            }}
          />
        </Grid>
      </Grid>

      {/* Table content */}
      <table cellSpacing={0}>
        <thead>
          <tr>
            <th> Select </th>
            <th> Jump </th>
            <th> Type </th>
            <th> File ID</th>
            <th> Text </th>
          </tr>
        </thead>
        <tbody>
          {filterSearch(autoLinkSuggestions, query).map((annotation, index) =>
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
    </div >
  );
}

export default LinkMenu;
