import { useEffect, useState } from "react";
import sortBy from "lodash.sortby";
import { SplitProps, MarkProps } from "./Split";
import { TextSpan } from "./span"


export const displaySplits = (content: string, annotations: TextSpan[]) => {
  let offsetStart = 0;
  let offsetEnd = 0;
  const splits: SplitProps[] = [];
  let currentTags: any[] = [];
  let hasLink: boolean = false;
  let hasBackLink: boolean = false;
  const allLinks = annotations.flatMap(anno => anno.links)

  let sortAnnotations: TextSpan[] = sortBy(annotations, (o: TextSpan) => o.start)
  while (offsetEnd < content.length) {

    // Find all annotations for which the current offset is within the span
    let nextStart = content.length;
    let currentEnd = content.length;
    hasLink = false;
    let height = 0;
    let heights = currentTags.map((tag) => { return tag.height });

    // find smallest unused height
    while (true) {
      if (heights.includes(height)) {
        height += 1;
      } else {
        break;
      }
    }

    for (let anno of sortAnnotations) {
      const { start, end, text, tag, fileid, links } = anno;
      // We want to stop this mark at the next mark's start...
      if (offsetStart < start) {
        nextStart = Math.min(start, nextStart);
      }
      // ...or at the earliest of the current mark's end
      if (offsetStart >= start && offsetStart < end) {

        // Only add the tag if it's not already in the list
        // I know this is really slow and probably there's a better way to do it, but I'm tired
        // This is checks for inclusion, ignoring the height parameter
        let isIn = currentTags.some((ctag) => {
          return (ctag.tag == tag && ctag.start == start && ctag.end == end && ctag.fileid == fileid);
        })
        if (!isIn) {
          currentTags.push({ tag: tag, height: height, start: start, end: end, fileid: fileid, anno: anno });
          height += 1;
        }
        currentEnd = Math.min(end, currentEnd);
      }
    }

    // Choose the minimum ending location, and set the hasLink property appropriately
    if (nextStart < currentEnd) {
      offsetEnd = nextStart;
    } else {
      offsetEnd = currentEnd;
    }

    for (let anno of sortAnnotations) {
      const { start, end, text, tag, fileid, links } = anno;
      if (start <= offsetStart && end >= offsetEnd) {
        hasLink = hasLink || (anno.links.length > 0);
      }
    }

    // Add the Mark with all the necessary tags
    splits.push({ start: offsetStart, end: offsetEnd, content: content.slice(offsetStart, offsetEnd), tags: [...currentTags], hasLink: hasLink })

    // update the new start value to the most recent end
    offsetStart = offsetEnd;

    // clear out the tags of those which have ended in this split
    if (offsetEnd == currentEnd) {
      currentTags = currentTags.filter(({ tag, height, start, end }) => {
        return end > currentEnd;
      });
    }
  }
  return splits;
}


export const selectionIsEmpty = (selection: Selection | null): boolean => {
  if (selection == null) {
    return true;
  }
  if (selection.anchorNode === null) {
    return true;
  }
  let position = selection.anchorNode.compareDocumentPosition(
    selection.focusNode,
  );

  return position === 0 && selection.focusOffset === selection.anchorOffset;
};

export const selectionIsBackwards = (selection: Selection): boolean => {
  if (selectionIsEmpty(selection)) return false;

  let position = selection.anchorNode.compareDocumentPosition(
    selection.focusNode,
  );

  let backward = false;
  if (
    (!position && selection.anchorOffset > selection.focusOffset) ||
    position === Node.DOCUMENT_POSITION_PRECEDING
  )
    backward = true;

  return backward;
};
