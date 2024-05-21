import React, { useContext, useEffect, useState } from "react";

import { LabelMenu } from "./Menu";
import { Split } from "./Split";
import { Link, TextSpan, makeLink } from "@/lib/span";
import {
  selectionIsEmpty,
  selectionIsBackwards,
  displaySplits,
  parseSelection,
  getViewerWidthInChars,
} from "@/lib/utils";
import { ColorMap, colors } from "@/lib/colors"
import sortBy from "lodash.sortby";
import { GlobalState, toggleLink, updateAnnotations, updateMark } from "@/lib/GlobalState";

type AnnotatorProps = {
  getSpan: (span: TextSpan) => TextSpan;
  style: any;
};

const getNextColor = function (start_color: string = "") {
  // If we have a "start color", start at that color.
  // Otherwise, findIndex returns -1, so 1+-1 = 0 is our start index (as desired)
  const items = Object.values(colors);
  let idx = 1 + items.findIndex((val) => val == start_color);
  if (idx == items.length) {
    idx = 0;
  }
  return items[idx];
}

/**
 * Annotator element which houses the source code and handles the highlight event (handleMouseUp).
 **/
const Annotator = (props: AnnotatorProps) => {
  /*  Context Menu stuff */
  const [selectionClicked, setSelectionClicked] = useState(false);

  /* State */
  const state = useContext(GlobalState);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
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
    if (start == end) return null;

    const splitIndex = state.annotations.findIndex((s) => s.end == end && s.start == start && s.tag == label);

    // If it doesn't already exist in the annotations, add it
    const nextColor = getNextColor(currentColor);
    setCurrentColor(nextColor)
    const newSpan = getSpan(
      {
        annoid: crypto.randomUUID(),
        start: start,
        end: end,
        text: state.tex.slice(start, end),
        tag: label,
        name: name,
        fileid: state.fileid,
        links: [],
        color: nextColor
      });
    if (splitIndex == -1) {
      updateAnnotations(state, [...state.annotations, newSpan]);
    }
    const selection = window.getSelection();
    if (selection != null) selection.empty();
    return newSpan;
  };

  const launchContextMenu = (e: any) => {
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
    const newPos = { x: e.pageX, y: e.pageY }
    setCursorPos(newPos);
  };

  const autoLink = (anno: TextSpan) => {

    /* ------------------------------------------------------------------
     *  If it's a name which is inside a definition or theorem, link it
     * -------------------------------------------------------------------
     */
    if (anno.tag == 'name') {
      let target: TextSpan | null = null;
      const isInside = (anno: TextSpan, defOrThm: TextSpan) => {
        return anno.start >= defOrThm.start && anno.end <= defOrThm.end;
      }
      for (const anno_b of state.annotations) {
        if ((anno_b.tag == "definition" || anno_b.tag == "theorem" || anno_b.tag == "reference") && isInside(anno, anno_b)) {
          // we want the most-inner definition
          if (target == null || (target.end - target.start) > (anno_b.end - anno_b.start)) {
            target = anno_b;
          }
        }
      }
      // If there's a possible target, add it as a link
      if (target != null) {
        toggleLink(state, anno, target)
      }
    }

    /* -------------------------------------------------------------------
     *  If it's a reference, link it to any exact-match names
     * -------------------------------------------------------------------
     */
    if (anno.tag == 'reference') {
      // filter
      // 1. names
      // 2. which occur before the reference
      // 3. with the same text as the reference
      // and then sort by start (in reverse order)
      const candidates: TextSpan[] = sortBy(
        state.annotations.filter((a) => a.tag == 'name' && a.end <= anno.start && a.text == anno.text),
        (o: TextSpan) => -o.start
      )

      // If we have any candidates, go for it.
      if (candidates.length > 0) {
        toggleLink(state, anno, candidates[0]);
      }
    }

    /* -----------------------------------------------------------------------------
     *  If it's a proof, link it to the previous theorem name within 500 characters
     * -----------------------------------------------------------------------------
     */
    if (anno.tag == 'proof') {
      // filter
      // 1. theorems
      // 2. which occur before the proof
      // 3. within 500 characters
      // and then sort by closest distance
      const candidates: TextSpan[] = sortBy(
        state.annotations.filter((a) =>
          a.tag == 'theorem'
          && a.end <= anno.start
          && a.end + 500 >= anno.start
        ),
        (o: TextSpan) => -(o.start - anno.start)
      )

      // If we have any candidates, go for it.
      if (candidates.length > 0) {
        toggleLink(state, anno, candidates[0]);
      }
    }

  }

  const handleContextMenuButtonPress = (start: number, end: number, label: string, name: string) => {
    // if we're editing something, just update the mark instead
    console.log('selected: ', state.editing)
    console.log('new: ', label, ' ', start, '-', end)
    let newAnno = null;
    if (state.editing != null) {
      newAnno = { ...state.editing, start: start, end: end, tag: label, text: state.tex.slice(start, end) };
      updateMark(state, newAnno);
    } else {
      newAnno = addMark(start, end, label, name);
    }
    setSelectionClicked(false);

    // Ensure we've successfully added a new mark
    if (newAnno == null) {
      return;
    }

    // Now run our heuristic auto-linker
    autoLink(newAnno);
  };

  const handleSelectionKeyPress = (e: any) => {
    switch (e.key) {
      case "Escape":
        setSelectionClicked(false);
        const selection = window.getSelection();
        if (selection != null) { selection.empty(); }
        break;
    }
  }

  const splits = displaySplits(state.tex, state.annotations);

  // Return the formatted code
  return (
    <div>
      <div className="tex-container" tabIndex={-1} onKeyUp={handleSelectionKeyPress} >
        <pre id="viewer" style={{ whiteSpace: "pre-wrap" }}>
          <div style={props.style} onMouseUp={launchContextMenu}>
            {splits.map((split) => (
              <Split key={`${split.start}-${split.end}`} {...split} />
            )
            )}
          </div>
        </pre>
      </div>
      {selectionClicked && (
        <LabelMenu
          top={cursorPos.y - 10}
          left={cursorPos.x - 10}
          range={parseSelection(currentSelection)}
          onButtonPress={(e, label, name, start, end) => { e.preventDefault(); handleContextMenuButtonPress(start, end, label, name) }}
          onMouseLeave={(e) => { setSelectionClicked(false); }}
        />
      )}
    </div>
  );
};

export default Annotator;
