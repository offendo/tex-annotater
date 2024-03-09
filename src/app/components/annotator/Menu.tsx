import React, { useState, useRef } from "react";
import { List, ListItemButton } from "@mui/material"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"

export interface LabelMenuProps {
  span: number[];
  pos: { x: number, y: number };
  colors: any;
  labels: any;
  onButtonPress: (e: any, label: string, name: string, start: number, end: number) => any;
  onMouseLeave?: (e: any) => any
}

export const LabelMenu = (props: LabelMenuProps) => {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState("")
  const [start, end] = props.span;
  return (
    <div
      onClick={(e) => { e.preventDefault() }}
      onMouseLeave={props.onMouseLeave}
      className="label-menu"
      style={{ top: props.pos.y, left: props.pos.x, position: "absolute", boxSizing: "border-box" }}
    >
      <List>
        {props.labels.map((label: string, index: number) => (
          <ListItemButton
            key={label}
            style={{ color: props.colors[label] }}
            onMouseDown={(e) => { e.preventDefault() }}
            onClick={(e) => { props.onButtonPress(e, label, "", start, end) }}
          >
            {label}
          </ListItemButton>
        ))}
      </List>
    </div>
  );
}
