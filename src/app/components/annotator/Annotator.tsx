import React, { useEffect, useState } from "react";

import { Menu } from "./Menu";
import { Split } from "./Split";
import { Link, TextSpan } from "../../lib/span";
import {
  selectionIsEmpty,
  selectionIsBackwards,
  displaySplits,
} from "../../lib/utils";
import { ColorMap, colors } from "../../lib/colors"
import MarkMenu from "./MarkMenu";
import LinkMenu from "./LinkMenu";
import sortBy from "lodash.sortby";

type AnnotatorProps = {
  fileid: string;
  labels: string[];
  colors: ColorMap;
  content: string;
  annotations: TextSpan[];
  otherAnnotations: TextSpan[];
  onAddAnnotation: (value: TextSpan[]) => any;
  getSpan: (span: TextSpan) => TextSpan;
  style: any;
};

const getNextColor = function (start_color: string = "") {
  // If we have a "start color", start at that color.
  // Otherwise, findIndex returns -1, so 1+-1 = 0 is our start index (as desired)
  const items = Object.values(colors)
  let idx = 1 + items.findIndex((val) => val == start_color);
  return items[idx]
}

/**
 * Annotator element which houses the source code and handles the highlight event (handleMouseUp).
 **/
const Annotator = (props: AnnotatorProps) => {
  /*  Context Menu stuff */
  const [selectionClicked, setSelectionClicked] = useState(false);
  const [markMenuClicked, setMarkMenuClicked] = useState(false);
  const [linkMenuClicked, setLinkMenuClicked] = useState(false);


  /* State */
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [hoveredAnnotations, setHoveredAnnotations] = useState<TextSpan[]>([]);
  const [clickedAnnotation, setClickedAnnotation] = useState<TextSpan>({} as TextSpan);
  const [currentColor, setCurrentColor] = useState<string>("");
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const getSpan = (span: TextSpan): TextSpan => {
    if (props.getSpan) {
      return props.getSpan(span);
    }
    return { start: span.start, end: span.end } as TextSpan;
  };

  /** Add annotation to document */
  const addMark = (start: number, end: number, label: string, name: string) => {
    if (!props.onAddAnnotation) return null;
    if (start == end) return null;

    const splitIndex = props.annotations.findIndex((s) => s.end == end && s.start == start && s.tag == label);

    // If it doesn't already exist in the annotations, add it
    const nextColor = getNextColor(currentColor);
    setCurrentColor(nextColor)
    const newSpan = getSpan(
      {
        start: start,
        end: end,
        text: props.content.slice(start, end),
        tag: label,
        name: name,
        fileid: props.fileid,
        links: [],
        highlightColor: nextColor
      });
    if (splitIndex == -1) {
      props.onAddAnnotation([...props.annotations, newSpan]);
    }
    const selection = window.getSelection();
    if (selection != null) selection.empty();
    return newSpan;
  };

  const updateMark = (anno: TextSpan) => {
    const splitIndex = props.annotations.findIndex((s) => s.end == anno.end && s.start == anno.start && s.tag == anno.tag);
    // If it doesn't already exist in the annotations, add it

    if (splitIndex == -1) {
      props.onAddAnnotation([...props.annotations, anno]);
    } else {
      props.onAddAnnotation([
        ...props.annotations.slice(0, splitIndex),
        anno,
        ...props.annotations.slice(splitIndex + 1),
      ]);
    }
  }

  const toggleLink = (anno: TextSpan, link: Link) => {
    const splitIndex = anno.links.findIndex((s) => s.end == link.end && s.start == link.start && s.tag == link.tag && s.fileid == link.fileid);
    if (splitIndex == -1) {
      anno.links = [...anno.links, link];
      updateMark(anno);
    } else {
      anno.links = [
        ...anno.links.slice(0, splitIndex),
        ...anno.links.slice(splitIndex + 1),
      ]
    }
  }

  /** Remove annotation on click */
  const removeMark = (ts: TextSpan) => {
    const splitIndex = props.annotations.findIndex((s) => s.end == ts.end && s.start == ts.start && s.tag == ts.tag && ts.fileid == s.fileid);
    if (splitIndex >= 0) {
      props.onAddAnnotation([
        ...props.annotations.slice(0, splitIndex),
        ...props.annotations.slice(splitIndex + 1),
      ]);
    }
  };

  const launchMarkContextMenu = (e, { start, end }) => {
    e.preventDefault();

    // If we have anything selected, ignore the menu press
    const selection = window.getSelection();
    if (selection == null || !selectionIsEmpty(selection)) {
      return;
    }

    const annotations = props.annotations.filter((s: TextSpan) => { return start >= s.start && end <= s.end });
    setHoveredAnnotations(annotations);

    // Hide the link menu
    setLinkMenuClicked(false);
    // Reveal the menu
    setMarkMenuClicked(true);

    // Move the menu to the right location
    setCursorPos({ x: e.pageX, y: e.pageY });
  };

  const handleAddLinkPress = (e, anno: TextSpan, index: number) => {

    // Hide the mark menu
    setMarkMenuClicked(false);

    // Launch the link menu button
    setClickedAnnotation(anno);
    setLinkMenuClicked(true);
  };

  const launchContextMenu = (e) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (selection === null) {
      setCurrentSelection(null);
      return;
    }
    if (selectionIsEmpty(selection)) {
      setCurrentSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const bb = range.getBoundingClientRect();

    // Checks if the click is within the bounding box of the selected text; otherwise, doesn't bring it up
    const BOUND = 50;
    if (!(bb.left - BOUND <= e.pageX && e.pageX <= bb.right + BOUND && bb.top - BOUND <= e.pageY && e.pageY <= bb.bottom + BOUND)) {
      return;
    }

    // Pass the selection to the menu
    setCurrentSelection(selection);

    // Reveal the menu
    setSelectionClicked(true);

    // Move the menu to the right location
    setCursorPos({ x: e.pageX, y: e.pageY });
  };

  const autoLink = (anno: TextSpan) => {

    //-------------------------------------------------------------------
    // If it's a name which is inside a definition or theorem, link it
    //-------------------------------------------------------------------
    if (anno.tag == 'name') {
      let target: TextSpan | null = null;
      const isInside = (anno: TextSpan, defOrThm: TextSpan) => {
        return anno.start >= defOrThm.start && anno.end <= defOrThm.end;
      }
      for (const anno_b of props.annotations) {
        if ((anno_b.tag == "definition" || anno_b.tag == "theorem") && isInside(anno, anno_b)) {
          // we want the most-inner definition
          if (target == null || (target.end - target.start) > (anno_b.end - anno_b.start)) {
            target = anno_b;
          }
        }
      }
      // If there's a possible target, add it as a link
      if (target != null) {
        toggleLink(anno, target)
      }
    }
    //-------------------------------------------------------------------

    //-------------------------------------------------------------------
    // If it's a reference, link it to any exact-match names
    //-------------------------------------------------------------------
    if (anno.tag == 'reference') {
      // filter
      // 1. names
      // 2. which occur before the reference
      // 3. with the same text as the reference
      // and then sort by start (in reverse order)
      const candidates: TextSpan[] = sortBy(
        props.annotations.filter((a) => a.tag == 'name' && a.end <= anno.start && a.text == anno.text),
        (o: TextSpan) => -o.start
      )

      // If we have any candidates, go for it.
      if (candidates.length > 0) {
        toggleLink(anno, candidates[0]);
      }
    }
    //-------------------------------------------------------------------

  }

  const handleContextMenuButtonPress = (start: number, end: number, label: string, name: string) => {
    const newAnno = addMark(start, end, label, name);
    setSelectionClicked(false);

    // Ensure we've successfully added a new mark
    if (newAnno == null) {
      return;
    }

    // Now run our heuristic auto-linker
    autoLink(newAnno);
  };

  const handleSelectionKeyPress = (e) => {
    switch (e.key) {
      case "Escape":
        setSelectionClicked(false);
        setMarkMenuClicked(false);
        setLinkMenuClicked(false);
        const selection = window.getSelection();
        if (selection != null) { selection.empty(); }
        break;
    }
  }

  const parseSelection = (selection: Selection | null) => {
    if (selection == null || selectionIsEmpty(selection)) {
      return [0, 0];
    }

    // This if block is just for type checking
    if (selection.anchorNode == null || selection.anchorNode.parentElement == null
      || selection.focusNode == null || selection.focusNode.parentElement == null) {
      return [0, 0];
    }

    let start = parseInt(selection.anchorNode.parentElement.getAttribute("data-start") || "0", 10) + selection.anchorOffset;
    let end = parseInt(selection.focusNode.parentElement.getAttribute("data-start") || "0", 10) + selection.focusOffset;

    if (selectionIsBackwards(selection)) {
      [start, end] = [end, start];
    }

    return [start, end];
  }

  const splits = displaySplits(props.content, props.annotations);

  // Return the formatted code
  return (
    <div className="tex-container" tabIndex={-1} onKeyUp={handleSelectionKeyPress} >
      <pre style={{ whiteSpace: "pre-wrap" }}>
        <div style={props.style} onContextMenu={launchContextMenu} onMouseUp={launchContextMenu}>
          {splits.map((split) => (
            <Split
              key={`${split.start}-${split.end}`}
              colors={props.colors}
              {...split}
              onClick={(e, anno) => {
                if (linkMenuClicked && anno != clickedAnnotation) {
                  toggleLink(clickedAnnotation, anno as Link);
                  setLinkMenuClicked(false);
                }
              }}
              onContextMenu={(e, loc) => launchMarkContextMenu(e, loc)} />
          )
          )}
        </div>
      </pre>
      {selectionClicked && (
        <Menu
          top={cursorPos.y - 10}
          left={cursorPos.x - 10}
          range={parseSelection(currentSelection)}
          colors={props.colors}
          labels={props.labels}
          onButtonPress={(e, label, name, start, end) => { e.preventDefault(); handleContextMenuButtonPress(start, end, label, name) }}
          onMouseLeave={(e) => { setSelectionClicked(false); }}
        />
      )}
      {markMenuClicked && (
        <MarkMenu
          top={cursorPos.y - 10}
          left={cursorPos.x - 10}
          colors={props.colors}
          annotations={hoveredAnnotations}
          onAddLinkPress={handleAddLinkPress}
          onDeletePress={(e, anno, index) => { removeMark(anno); setMarkMenuClicked(false); }}
          onEditPress={(e, anno, index) => {}}
          onMouseLeave={(e) => { setMarkMenuClicked(false); }}
        />
      )}
      {linkMenuClicked && (
        <LinkMenu
          top={cursorPos.y - 10}
          left={cursorPos.x - 10}
          colors={props.colors}
          selectedAnnotation={clickedAnnotation}
          annotations={props.annotations}
          otherAnnotations={props.otherAnnotations}
          onLinkSelectPress={(e, anno, link) => { toggleLink(anno, link); setLinkMenuClicked(false); }}
          onMouseLeave={(e) => {}}
          onClosePress={(e) => { setLinkMenuClicked(false); }}
          onDeletePress={(e, anno) => { removeMark(anno); setLinkMenuClicked(false); }}
        />
      )}
    </div>
  );
};

export default Annotator;
