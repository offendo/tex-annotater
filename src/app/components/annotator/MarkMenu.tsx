import React, { useState } from "react";
import { TextSpan } from "@/app/lib/span";
import { IconButton, Tooltip } from "@mui/material";
import { Dropdown } from '@mui/base/Dropdown';
import { MenuButton } from '@mui/base/MenuButton';
import { DataGrid } from '@mui/x-data-grid';
import { Menu } from '@mui/base/Menu';
import { MenuItem } from '@mui/base/MenuItem';
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';
import { selectionIsEmpty } from "@/app/lib/utils";


export interface MarkMenuProps {
    colors: any;
    annotations: TextSpan[];
    onAddLinkPress: (e: any, annotation: TextSpan, index: number) => any;
    onDeletePress: (e: any, annotation: TextSpan, index: number) => any;
    onEditPress: (e: any, annotation: TextSpan, index: number) => any;
    onMouseLeave: (e: any) => any
}

export function MarkMenu(props: MarkMenuProps) {
    const [selected, setSelected] = useState<number>(-1);

    const toggleSelected = (index: number) => {
        if (selected == index) {
            setSelected(-1);
        } else {
            setSelected(index);
        }
    }

    return (
        <Menu
            style={{
                backgroundColor: "var(--secondary-background-color)",
                display: "grid",
                width: "500px",
                maxWidth: "700px",
                border: "1px solid black",
                borderRadius: "5px"
            }}
        >
            {props.annotations.map((annotation, index) => (
                <MenuItem
                    style={{ display: "grid", gridTemplateColumns: "1fr 2fr 4fr 1fr" }}
                    key={`${annotation.name}-${annotation.start}-${annotation.end}-${annotation.tag}`}
                >
                    {/* Link button */}
                    <IconButton size="small" onClick={(e) => props.onAddLinkPress(e, annotation, index)}> <BoltIcon /> </IconButton>

                    {/* Tag name */}
                    <span style={{ display: "flex", justifyContent: "left", alignItems: "center", color: props.colors[annotation.tag] }}>
                        {`${annotation.tag}`}
                    </span>

                    {/* Content */}
                    <span className="expand-text" style={{ display: "flex", justifyContent: "left", alignItems: "center", minWidth: "300px" }}>
                        <Tooltip title="Click to expand">
                            <pre style={{ whiteSpace: "pre-wrap" }} onClick={(e) => { e.stopPropagation(); toggleSelected(index); }}>
                                {selected == index ? `${annotation.text}` : `${annotation.text.slice(0, Math.min(30, annotation.text.length)).replaceAll('\n', ' \\ ')}...`}
                            </pre>
                        </Tooltip>
                    </span>

                    {/* Delete button */}
                    <IconButton size="small" onClick={(e) => props.onDeletePress(e, annotation, index)}> <DeleteIcon /> </IconButton>
                </MenuItem >
            ))
            }
        </Menu >
    );
}
export default MarkMenu;
