import React, { useContext, useRef, useState } from "react";
import { MarkMenu } from './MarkMenu';
import { TextSpan, Link } from "@/lib/span";
import { SplitTagProps, rgbToHex, parseColor } from "@/lib/utils";
import { GlobalState, updateMark } from "@/lib/GlobalState";
import { sortBy } from "lodash";

export interface SplitProps {
  content: string
  start: number
  end: number
}

export interface MarkProps extends SplitProps {
  tags: SplitTagProps[]
  onClick: (e: any, anno: TextSpan, location: any) => (any)
  onContextMenu: (e: any, location: any) => (any)
}

export function isMarkProps(props: SplitProps): props is MarkProps {
  return "tags" in props && props.tags.length > 0;
}

export function Split(props: SplitProps): React.JSX.Element {
  if (isMarkProps(props)) {
    return <Mark {...props} />
  };
  return (
    <span
      data-start={props.start}
      data-end={props.end}
    >
      {props.content}
    </span>
  );

};

export function Mark(props: MarkProps): React.JSX.Element {

  const state = useContext(GlobalState);

  const [linkTargetColor, setLinkTargetColor] = useState<string>("#00000000");

  const handleHover = (e, split) => {
    if (!e.ctrlKey) {
      return;
    }
    // Highlight any split where this annotation exists
    const nodes = document.querySelectorAll(`[data-annoid='${split.anno.annoid}']`);
    for (const n of nodes) {
      if (split.anno.links.length > 0){
        n.style.backgroundColor = split.anno.links[0].color + '90';
      } else {
        n.style.backgroundColor = split.anno.color + '90';
      }
    }

    // Highlight the link target as well.
    if (split.anno.links.length > 0) {
      const targets = document.querySelectorAll(`[data-annoid='${split.anno.links[0].target}']`);
      for (const t of targets) {
        // we've already set the color, don't do it again or we'll overwrite link target color
        // i know this is a ridiculous hack, but I don't really know how else to do it properly
        if (linkTargetColor.slice(-1) != ')') {
          setLinkTargetColor(t.style.backgroundColor);
          t.style.backgroundColor = split.anno.links[0].color + '90';
        }
      }
    }
  }
  const handleUnHover = (e, split) => {
    const nodes = document.querySelectorAll(`[data-annoid='${split.anno.annoid}']`);
    for (const n of nodes) {
      n.style.backgroundColor = getSplitColor(split);
    }
    if (split.anno.links.length > 0) {
      const targets = document.querySelectorAll(`[data-annoid='${split.anno.links[0].target}']`);
      for (const t of targets) {
        console.log('setting back to: ', linkTargetColor)
        t.style.backgroundColor = linkTargetColor;
        setLinkTargetColor("#00000000");
      }
    }
  }

  const getSplitColor = (split: any) => {
    if (state.editing != null && split.anno.annoid == state.editing.annoid) {
      return "#00000080"; // faded black
    }
    // If it's linked to something, use the link's target color
    if (split.anno.links.length > 0) {
      if (split.anno.tag == 'name' && split.anno.links[0].tag != 'name') {
        return split.anno.color + '70';
      }
      return split.anno.links[0].color + "70";
    }
    // otherwise, set it to transparent
    else {
      return "var(--background-color)" + "00";
    }
  }

  // Nest the tag as many times as necessary
  let final: any = props.content;

  sortBy(props.tags, (s) => { return -(s.end - s.start); }).forEach((split, idx) => {
    if (idx == props.tags.length - 1) {
      // on the last iteration, grab the bounding box
      final = (
        <span
          id={split.anno.annoid}
          data-start={props.start}
          data-annoid={split.anno.annoid}
          data-end={props.end}
          data-uid={split.tag}
          // ref={finalRef}
          style={{
            borderColor: (state.colors as any)[split.tag],
            borderBottomWidth: "3px",
            borderBottomStyle: "solid",
            paddingBottom: split.height * 4,
            backgroundColor: getSplitColor(split),
            backgroundClip: "content-box",
          }}
          onMouseOver={(e) => handleHover(e, split)}
          onMouseLeave={(e) => handleUnHover(e, split)}
        >
          <MarkMenu
            anno={split.anno}
            openLinkMenuByDefault={props.tags.length == 1}
            innerContent={final}
            start={props.start}
            end={props.end}
          />
        </span>
      )
    }
    else {
      final = (
        <span
          style={{
            borderColor: (state.colors as any)[split.tag],
            borderBottomWidth: "3px",
            borderBottomStyle: "solid",
            paddingBottom: split.height * 4,
            backgroundColor: getSplitColor(split),
            backgroundClip: "content-box"
          }}
          data-annoid={split.anno.annoid}
          data-start={props.start}
          data-end={props.end}
          data-uid={split.tag}
          key={crypto.randomUUID()}
        >
          {final}
        </span>
      );
    }
  });

  return final;
}
export default Mark;
