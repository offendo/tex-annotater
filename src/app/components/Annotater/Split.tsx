import React, { useRef, useState } from "react";
import { MenuButton } from '@mui/base/MenuButton';
import { Dropdown } from '@mui/base/Dropdown';
import { MarkMenu } from './MarkMenu';
import ColorMap from "@/app/lib/colors";
import { TextSpan, Link } from "@/app/lib/span";
import { selectionIsEmpty, parseSelection, SplitTagProps } from "@/app/lib/utils";

export interface SplitProps {
  content: string
  tags?: any[]
  annotations?: TextSpan[]
  otherFileAnnotations?: TextSpan[]
  hasLink?: boolean
  colors?: ColorMap
  start: number
  end: number
  onClick?: (arg: any, anno: TextSpan, location: any) => any
  onContextMenu?: (e: any, location: any) => (any)
  toggleLink: (source: TextSpan, target: TextSpan) => any;
  deleteAnnotation: (annotation: TextSpan, index: number) => any;
  editAnnotation: (annotation: TextSpan, index: number) => any;
}

export interface MarkProps extends SplitProps {
  key: string
  tags: SplitTagProps[]
  mark?: boolean
  hasLink?: boolean
  colors: ColorMap
  annotations: TextSpan[]
  otherFileAnnotations: TextSpan[]
  onClick: (e: any, anno: TextSpan, location: any) => (any)
  onContextMenu: (e: any, location: any) => (any)
  toggleLink: (source: TextSpan, target: TextSpan) => any;
  deleteAnnotation: (annotation: TextSpan, index: number) => any;
  editAnnotation: (annotation: TextSpan, index: number) => any;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const getSplitColor = (split: any) => {
    // If it's linked to something, use the link's target color
    if (split.anno.links.length > 0) {
      if (split.anno.tag == 'name') {
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
  const finalRef = useRef<any>(null);

  props.tags.forEach((split, idx) => {
    if (idx == props.tags.length - 1) {
      // on the last iteration, grab the bounding box
      final = (
        <span
          id={split.anno.annoid}
          data-start={props.start}
          data-end={props.end}
          data-uid={split.tag}
          className="annotation"
          ref={finalRef}
          style={{
            borderColor: props.colors[split.tag],
            paddingBottom: split.height * 4,
            backgroundColor: getSplitColor(split),
            backgroundClip: "content-box",
          }}
        >
          <MarkMenu
            anno={split.anno}
            openLinkMenuByDefault={props.tags.length == 1}
            innerContent={final}
            colors={props.colors}
            start={props.start}
            end={props.end}
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
          ref={finalRef}
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
