import React, { useState, useRef } from "react";
import { List, ListItemButton } from "@mui/material"

export interface MenuProps {
  left: number;
  top: number;
  colors: any;
  labels: any;
  range: number[];
  onButtonPress: (e: any, label: string, name: string, start: number, end: number) => any;
  onMouseLeave: (e: any) => any
}

export const Menu = (props: MenuProps) => {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState("")
  const [start, end] = props.range;

  return (
    <div
      onClick={(e) => { e.preventDefault() }}
      onMouseLeave={props.onMouseLeave}
      className="label-menu"
      style={{ top: props.top, left: props.left, position: "absolute", boxSizing: "border-box" }}
    >
      <List>
        {props.labels.map((label: string, index: number) => (
          <ListItemButton
            key={label}
            style={{ color: props.colors[label] }}
            onMouseDown={(e) => { e.preventDefault() }}
            onClick={(e) => { props.onButtonPress(e, label, name, start, end) }}
          >
            {label}
          </ListItemButton>
        ))}
      </List>
    </div>
  );
}
