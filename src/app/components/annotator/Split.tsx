import React, { useRef, useState } from "react";
import { MenuButton } from '@mui/base/MenuButton';
import { Dropdown } from '@mui/base/Dropdown';
import { MarkMenu } from './MarkMenu';
import ColorMap from "@/app/lib/colors";
import { TextSpan } from "@/app/lib/span";
import { selectionIsEmpty, SplitTagProps } from "@/app/lib/utils";
import { MARGINS } from "@/app/lib/consts";

export interface SplitProps {
  content: string
  tags?: SplitTagProps[]
  allAnnotations?: TextSpan[]
  otherAnnotations?: TextSpan[]
  clickedAnnotations?: TextSpan[]
  hasLink?: boolean
  colors?: ColorMap
  start: number
  end: number
  onClick?: (arg: any, anno: TextSpan, location: any) => any
  onContextMenu?: (e: any, location: any) => (any)
  onAddLinkPress: (e: any, annotation: TextSpan, index: number) => any;
  onDeletePress: (e: any, annotation: TextSpan, index: number) => any;
  onEditPress: (e: any, annotation: TextSpan, index: number) => any;
  onMouseLeave: (e: any) => any
}

export interface MarkProps extends SplitProps {
  key: string
  tags: SplitTagProps[]
  mark?: boolean
  hasLink?: boolean
  colors: ColorMap
  allAnnotations: TextSpan[]
  otherAnnotations: TextSpan[]
  clickedAnnotations: TextSpan[]
  onClick: (e: any, anno: TextSpan, location: any) => (any)
  onContextMenu: (e: any, location: any) => (any)
  onAddLinkPress: (e: any, annotation: TextSpan, index: number) => any;
  onDeletePress: (e: any, annotation: TextSpan, index: number) => any;
  onEditPress: (e: any, annotation: TextSpan, index: number) => any;
  onMouseLeave: (e: any) => any
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
        return split.anno.highlightColor + '70';
      }
      return split.anno.links[0].highlightColor + "70";
    }
    // otherwise, set it to transparent
    else {
      return "var(--background-color)" + "00";
    }
  }

  const handleOpenChange = (e, split) => {
    if (menuOpen) {
      setMenuOpen(true);
      return;
    } else {
      props.onClick(e, split.anno, { start: props.start, end: props.end })
      setMenuOpen(false);
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

          <Dropdown onOpenChange={(e) => handleOpenChange(e, split)} >
            <MenuButton
              slots={{ root: "span" }} // necessary to ensure formatting stays correct after highlighting
              key={`${props.start}-${props.end}-${split.tag}-${split.height}`}
              data-start={props.start}
              data-end={props.end}
              data-uid={split.tag}
              disabled={!selectionIsEmpty(window.getSelection())}
              onClick={(e: any) => {
                const { width, height } = finalRef.current.getBoundingClientRect();
                console.log('pos: ', [e.pageX, e.pageY]);
                console.log('scaled pos: ', [e.pageX - MARGINS, e.pageY  - MARGINS]);
                setPos({ left: e.pageX  - MARGINS, top: e.pageY - MARGINS })
              }}
            >
              {final}
            </MenuButton>
            <MarkMenu
              pos={pos}
              colors={props.colors}
              annotations={props.clickedAnnotations}
              allAnnotations={props.allAnnotations}
              otherAnnotations={props.otherAnnotations}
              onAddLinkPress={props.onAddLinkPress}
              onDeletePress={props.onDeletePress}
              onEditPress={props.onEditPress}
              onMouseLeave={props.onMouseLeave}
            />
          </Dropdown>
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
