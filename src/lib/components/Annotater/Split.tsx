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

  const LIGHT = '20'
  const DARK = '70'

  const state = useContext(GlobalState);

  const [linkTargetColor, setLinkTargetColor] = useState<string | null>(null);

  const handleHover = (e, anno) => {
    if (!e.ctrlKey) {
      return;
    }
    // Highlight any split where this annotation exists
    const nodes = document.querySelectorAll(`[data-annoid='${anno.annoid}']`);
    for (const n of nodes) {
      if (anno.links.length > 0) {
        n.style.backgroundColor = anno.links[0].color + '90';
      } else {
        n.style.backgroundColor = anno.color + '90';
      }
    }

    // Highlight the link target as well.
    if (anno.links.length > 0) {
      const targets = document.querySelectorAll(`[data-annoid='${anno.links[0].target}']`);
      for (const t of targets) {
        // we've already set the color, don't do it again or we'll overwrite link target color
        if (linkTargetColor == null) {
          setLinkTargetColor(t.style.backgroundColor);
        }
        t.style.backgroundColor = anno.links[0].color + '90';
      }
    }
  }

  const handleUnHover = (e, anno: TextSpan, light?: boolean) => {
    const nodes = document.querySelectorAll(`[data-annoid='${anno.annoid}']`);
    for (const n of nodes) {
      n.style.backgroundColor = getAnnoColor(anno, light);
    }
    // no need to unhover, already unhovered
    if (linkTargetColor == null) {
      return;
    }
    if (anno.links.length > 0) {
      const targets = document.querySelectorAll(`[data-annoid='${anno.links[0].target}']`);
      for (const t of targets) {
        t.style.backgroundColor = linkTargetColor;
      }
      setLinkTargetColor(null);
    }
  }

  const getAnnoColor = (anno: any, light?: boolean) => {
    let alpha = DARK;
    if (light) {
      console.log(`anno`, anno, `  is light ? ${light}`)
      alpha = LIGHT;
    }
    if (state.editing != null && anno.annoid == state.editing.annoid) {
      return "#00000080"; // faded black
    }
    // If it's linked to something, use the link's target color
    if (anno.links.length > 0) {
      if (anno.tag == 'name' && anno.links[0].tag != 'name') {
        return anno.color + alpha;
      }
      return anno.links[0].color + alpha;
    } else if (light == false){
      return '#ee0000' + '90';
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
            borderColor: (state.colors as any)[split.tag] + (split.light ? LIGHT : ''),
            borderBottomWidth: "3px",
            borderBottomStyle: "solid",
            paddingBottom: split.height * 4,
            backgroundColor: getAnnoColor(split.anno, split.light),
            backgroundClip: "content-box",
          }}
          onMouseOver={(e) => handleHover(e, split.anno)}
          onMouseLeave={(e) => handleUnHover(e, split.anno, split.light)}
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
            borderColor: (state.colors as any)[split.tag] + (split.light ? LIGHT : ''),
            borderBottomWidth: "3px",
            borderBottomStyle: "solid",
            paddingBottom: split.height * 4,
            backgroundColor: getAnnoColor(split.anno, split.light),
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
