import React from "react";
import { MarkMenu } from './MarkMenu';
import ColorMap from "@/app/lib/colors";
import { TextSpan, Link } from "@/app/lib/span";
import { selectionIsEmpty } from "@/app/lib/utils"


export interface SplitProps {
  content: string
  tags?: any[]
  annotations?: TextSpan[]
  otherFileAnnotations?: TextSpan[]
  colors?: ColorMap
  start: number
  end: number
  onClick?: (e: any, anno: TextSpan, location: any) => any
  toggleLink?: (annotation: TextSpan, link: Link) => any;
  deleteAnnotation?: (annotation: TextSpan) => any;
  editAnnotation?: (annotation: TextSpan) => any;
}

export interface MarkProps extends SplitProps {
  key: string
  tags: any[]
  colors: ColorMap
  annotations: TextSpan[]
  otherFileAnnotations: TextSpan[]
  onClick: (e: any, anno: TextSpan, location: any) => any
  toggleLink: (annotation: TextSpan, link: Link) => any;
  deleteAnnotation: (annotation: TextSpan) => any;
  editAnnotation: (annotation: TextSpan) => any;
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
      className="split"
    >
      {props.content}
    </span>
  );

};

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
    if (idx == props.tags.length - 1) {
      final = (
        <span
          data-start={props.start}
          data-end={props.end}
          data-uid={split.tag}
          className="annotation"
          style={{
            borderColor: props.colors[split.tag],
            paddingBottom: split.height * 4,
            backgroundColor: getSplitColor(split),
            backgroundClip: "content-box",
          }}
        >
          <MarkMenu
            innerContent={final}
            colors={props.colors}
            span={{ start: props.start, end: props.end }}
            annotations={props.annotations}
            otherFileAnnotations={props.otherFileAnnotations}
            toggleLink={props.toggleLink}
            deleteAnnotation={props.deleteAnnotation}
            editAnnotation={props.editAnnotation}
          />
        </span>
      )
    }
    else {
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
        >
          {final}
        </span>
      );
    }
  });

  return final;
}
export default Mark;
