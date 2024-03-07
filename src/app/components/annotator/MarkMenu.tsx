import React, { useState } from "react";
import { TextSpan } from "@/app/lib/span";
import { Card, CardActions, CardContent, Grid, IconButton, Popover, Tooltip } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';
import Collapse from '@mui/material/Collapse';
import LinkMenu from "./LinkMenu";
import { selectionIsEmpty, parseSelection } from "@/app/lib/utils";

import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';


export interface MarkMenuProps {
    innerContent: any;
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
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [hoveredAnnotations, setHoveredAnnotations] = useState<TextSpan[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        // setAnchorEl(e.currentTarget);
        const selection = window.getSelection();
        if (selectionIsEmpty(selection)) {
            setPos({ left: e.clientX, top: e.clientY });
            const [start, end] = parseSelection(selection)
            const annotations = props.allAnnotations.filter((s: TextSpan) => { return start >= s.start && end <= s.end });
            setHoveredAnnotations(annotations);
            setMenuOpen(!menuOpen);
        }
    };
    const handleClose = () => {
        setMenuOpen(false);
    };

    const toggleSelected = (index: number) => {
        if (selected == index) {
            setSelected(-1);
        } else {
            setSelected(index);
        }
    }


    const Row = ({ annotation, index }: { annotation: TextSpan, index: number }) => {
        const [linksOpen, setLinksOpen] = useState<boolean>(false);
        const handleLinkButtonPress = (e) => {
            setPos({ left: e.clientX, top: e.clientY });
            setLinksOpen(!linksOpen);
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
                        <Collapse in={linksOpen} timeout="auto" unmountOnExit orientation="vertical" collapsedSize={0}>
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
        <span>
            <span onClick={handleClick} >
                {props.innerContent}
            </span>
            <Menu
                open={menuOpen}
                onClose={handleClose}
                anchorPosition={pos}
                anchorReference="anchorPosition"
                style={{
                    backgroundColor: "var(--secondary-background-color)",
                    display: "block",
                    height: "fit-content",
                    width: "500px",
                    maxWidth: "700px",
                    border: "1px solid black",
                    borderRadius: "5px"
                }}
            >
                {hoveredAnnotations.map((annotation, index) => {
                    console.log("Testing")
                    return (
                        <MenuItem key={`${annotation.start}-${annotation.end}-${annotation.tag}-${index}`} >
                            {/*<Row annotation={annotation} index={index} />*/}
                            {(() => { console.log("This is a test"); return " This is a test "; })()}
                        </MenuItem >
                    );
                }
                )}
            </Menu >
        </span >
    );
}
export default MarkMenu;
