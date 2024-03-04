import React from "react";
import ColorMap from "./colors";
import { TextSpan } from "./span";

export interface SplitProps {
  content: string
  tags?: any[]
  hasLink?: boolean
  colors?: ColorMap
  start: number
  end: number
  onClick?: (arg: any, anno: TextSpan) => any
  onContextMenu?: (e: any, location: any) => (any)
}

export function Split(props: SplitProps): React.JSX.Element {
  if (isMarkProps(props)) {
    return <Mark {...props} />
  };
  return (
    <span
      data-start={props.start}
      data-end={props.end}
      className="split"
    >
      {props.content}
    </span>
  );

};

export interface MarkProps extends SplitProps {
  key: string
  tags: any[]
  mark?: boolean
  hasLink?: boolean
  colors: ColorMap
  onClick: (e: any, anno: TextSpan) => (any)
  onContextMenu: (e: any, location: any) => (any)
}

export function isMarkProps(props: SplitProps): props is MarkProps {
  return "tags" in props && props.tags.length > 0;
}

export function Mark(props: MarkProps): React.JSX.Element {

  let final: any = props.content;

  const getSplitColor = (split: any) => {
    // If it's linked to something, use the link's target color
    if (split.anno.links.length > 0) {
      if (split.anno.tag == 'name') {
        return split.anno.highlightColor + '70';
      }
      return split.anno.links[0].highlightColor + "70";
    }
    // otherwise, set it to transparent
    else {
      return "var(--background-color)" + "00";
    }
  }

  // Nest the tag as many times as necessary
  props.tags.forEach((split, idx) => {
    final = (
      <span
        className="annotation"
        style={{
          borderColor: props.colors[split.tag],
          paddingBottom: split.height * 4,
          backgroundColor: getSplitColor(split),
          backgroundClip: "content-box"
        }}
        data-start={props.start}
        data-end={props.end}
        data-uid={split.tag}
        key={`${props.start}-${props.end}-${split.tag}-${split.height}`}
        // only proc onClick if it's the inner-most span
        onClick={(e) => (idx == props.tags.length - 1) ? props.onClick(e, split.anno) : null}
        onContextMenu={(e) => props.onContextMenu(e, { start: props.start, end: props.end })}
      >
        {final}
      </span>
    );
  });

  return final;
}
export default Mark;
