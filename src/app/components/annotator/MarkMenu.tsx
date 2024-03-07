import React, { useState } from "react";
import { TextSpan } from "@/app/lib/span";
import { Card, CardActions, CardContent, Grid, IconButton, Popover, Tooltip } from "@mui/material";
import { Menu } from '@mui/base/Menu';
import { MenuItem } from '@mui/base/MenuItem';
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';
import Collapse from '@mui/material/Collapse';
import LinkMenu from "./LinkMenu";


export interface MarkMenuProps {
    colors: any;
    annotations: TextSpan[];
    allAnnotations: TextSpan[];
    otherAnnotations: TextSpan[];
    onAddLinkPress: (e: any, annotation: TextSpan, index: number) => any;
    onDeletePress: (e: any, annotation: TextSpan, index: number) => any;
    onEditPress: (e: any, annotation: TextSpan, index: number) => any;
    onMouseLeave: (e: any) => any
}

export function MarkMenu(props: MarkMenuProps) {
    const [selected, setSelected] = useState<number>(-1);
    const [pos, setPos] = useState({ left: 0, top: 0 });

    const toggleSelected = (index: number) => {
        if (selected == index) {
            setSelected(-1);
        } else {
            setSelected(index);
        }
    }


    const Row = ({ annotation, index }: { annotation: TextSpan, index: number }) => {
        const [open, setOpen] = useState<boolean>(false);
        const handleLinkButtonPress = (e) => {
            // setPos({ left: e.clientX, top: e.clientY });
            setOpen(!open);
            console.log(`Set open to ${open}`)
            e.stopPropagation();
        }

        return (
            <Card
                style={{ backgroundColor: "inherit", border: "0px" }}
            >
                <Grid container spacing={1}>
                    <Grid item xs={2}>
                        <CardActions disableSpacing>
                            {/* Link button */}
                            <IconButton onClick={(e) => { handleLinkButtonPress(e) }}> <BoltIcon /> </IconButton>

                            {/* Delete button */}
                            <IconButton size="small" onClick={(e) => props.onDeletePress(e, annotation, index)}> <DeleteIcon /> </IconButton>
                        </CardActions>
                    </Grid>

                    <Grid item xs={3}>
                        <CardContent>
                            {/* Tag name */}
                            <span style={{ color: props.colors[annotation.tag] }}>
                                {`${annotation.tag}`}
                            </span>
                        </CardContent>
                    </Grid>
                    <Grid item xs={7}>
                        <CardContent>
                            {/* Content */}
                            <span className="expand-text" style={{ minWidth: "300px" }}>
                                <Tooltip title="Click to expand">
                                    <pre style={{ whiteSpace: "pre-wrap" }} onClick={(e) => { e.stopPropagation(); toggleSelected(index); }}>
                                        {selected == index ? `${annotation.text}` : `${annotation.text.slice(0, Math.min(25, annotation.text.length)).trim().replaceAll('\n', ' ')}...`}
                                    </pre>
                                </Tooltip>
                            </span>
                        </CardContent>
                    </Grid>
                    <Grid item xs={12}>
                        {/* Link menu card*/}
                        <Collapse in={open} timeout="auto" unmountOnExit orientation="vertical" collapsedSize={0}>
                            <CardContent>
                                <LinkMenu
                                    left={pos.left}
                                    top={pos.top}
                                    colors={props.colors}
                                    selectedAnnotation={annotation}
                                    annotations={props.allAnnotations}
                                    otherAnnotations={props.otherAnnotations}
                                    onClosePress={() => {}}
                                    onAddLinkPress={() => {}}
                                    onDeletePress={() => {}}
                                />
                            </CardContent>
                        </Collapse>
                    </Grid>
                </Grid>
            </Card>
        );
    }


    return (
        <div>
            <Menu
                // anchorPosition={pos}
                // anchorReference="anchorPosition"
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
                        key={`${annotation.start}-${annotation.end}-${annotation.tag}-${index}`}
                    >
                        <Row annotation={annotation} index={index} />

                    </MenuItem >
                ))
                }
            </Menu >
        </div>
    );
}
export default MarkMenu;
