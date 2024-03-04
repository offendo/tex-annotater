import React, { useState } from "react";
import { TextSpan } from "../../lib/span";
import { IconButton } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';

export interface MarkMenuProps {
    left: number;
    top: number;
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
        <div
            className="mark-menu"
            style={{ top: props.top, left: props.left, position: "absolute", boxSizing: "border-box" }}
        >
            <table style={{ tableLayout: "fixed" }}>
                <thead>
                    <tr>
                        <th> </th>
                        <th> Type </th>
                        <th> Text </th>
                    </tr>
                </thead>
                <tbody>
                    {props.annotations.map((annotation, index) => (
                        <React.Fragment key={`${annotation.name}-${annotation.start}-${annotation.end}-${annotation.tag}`}>
                            <tr>
                                <td>
                                    <IconButton size="small" onClick={(e) => props.onAddLinkPress(e, annotation, index)}> <BoltIcon/> </IconButton>
                                </td>
                                <td style={{ textAlign: "center", minWidth: "100px", color: props.colors[annotation.tag] }}>
                                    <span> {`${annotation.tag}`} </span>
                                </td>
                                <td className="expand-text" style={{ minWidth: "300px" }} onClick={(e) => toggleSelected(index)}>
                                    <pre style={{ whiteSpace: "pre-wrap" }}>
                                        {selected == index ? `${annotation.text}` : `${annotation.text.slice(0, Math.min(30, annotation.text.length)).replaceAll('\n', ' \\ ')}...`}
                                    </pre>
                                </td>
                                <td>
                                    <IconButton size="small" onClick={(e) => props.onDeletePress(e, annotation, index)}> <DeleteIcon/> </IconButton>
                                </td>
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div >
    );
}
// <a className="mark-menu-option" onClick={(e) => props.onEditPress(e, annotation, index)}> {"edit"} </a>
export default MarkMenu;
