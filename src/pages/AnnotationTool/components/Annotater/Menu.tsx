import React, { useState, useRef, useContext } from "react";
import { IconButton, List, ListItemButton } from "@mui/material"
import CancelIcon from "@mui/icons-material/Cancel";
import { GlobalState, Status, toggleEditStatus } from "@/lib/GlobalState";
import { useTheme } from "@mui/material";

export interface MenuProps {
  left: number;
  top: number;
  range: number[];
  onButtonPress: (e: any, label: string, name: string, start: number, end: number) => any;
  onMouseLeave: (e: any) => any
}

export const LabelMenu = (props: MenuProps) => {
  const theme = useTheme();
  const state = useContext(GlobalState);
  const [name, setName] = useState("")
  const [selected, setSelected] = useState("")
  const [start, end] = props.range;

  return (
    <div
      onClick={(e) => { e.preventDefault() }}
      onMouseLeave={props.onMouseLeave}
      className="label-menu"
      style={{
        top: props.top,
        left: props.left,
        position: "absolute",
        backgroundColor: theme.palette.background.default,
        fontFamily: theme.typography.fontFamily
      }}
    >
      <List>
        {state.labels.map((label: string, index: number) => (
          <ListItemButton
            key={label}
            style={{ color: (state.colors as any)[label] }}
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
