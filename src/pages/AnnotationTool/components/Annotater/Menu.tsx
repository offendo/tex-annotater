import React, { useState, useRef, useContext } from "react";
import { List, ListItemButton } from "@mui/material"
import Menu from "@mui/material/Menu"
import MenuItem from "@mui/material/MenuItem"
import { GlobalState } from "../GlobalState";

export interface MenuProps {
  left: number;
  top: number;
  range: number[];
  onButtonPress: (e: any, label: string, name: string, start: number, end: number) => any;
  onMouseLeave: (e: any) => any
}

export const LabelMenu = (props: MenuProps) => {
  const state = useContext(GlobalState);
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
        {state.labels.map((label: string, index: number) => (
          <ListItemButton
            key={label}
            style={{ color: state.colors[label] }}
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
