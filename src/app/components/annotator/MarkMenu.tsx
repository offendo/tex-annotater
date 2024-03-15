import React, { useState, useRef } from "react";
import { TextSpan, Link } from "@/app/lib/span";
import { Card, CardActions, CardContent, Grid, IconButton, Tooltip } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import BoltIcon from '@mui/icons-material/Bolt';
import Collapse from '@mui/material/Collapse';
import LinkMenu from "./LinkMenu";
import { selectionIsEmpty } from "@/app/lib/utils";

import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';


export interface MarkMenuProps {
    anno: TextSpan;
    innerContent: any;
    colors: any;
    start: number;
    end: number;
    annotations: TextSpan[];
    otherFileAnnotations: TextSpan[];
    toggleLink: (source: TextSpan, target: TextSpan) => any;
    deleteAnnotation: (annotation: TextSpan, index: number) => any;
    editAnnotation: (annotation: TextSpan, index: number) => any;
    openLinkMenuByDefault: boolean;
}

export function MarkMenu(props: MarkMenuProps) {
    const [selected, setSelected] = useState<number>(-1);
    const [pos, setPos] = useState({ left: 0, top: 0 });
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [hoveredAnnotations, setHoveredAnnotations] = useState<TextSpan[]>([]);

    const handleJumpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (props.anno.links.length > 0) {
            console.log("I am ", props.anno.annoid)
            console.log('jumping to: ', props.anno.links[0].target);
            const file = props.anno.links[0].fileid;
            const target = props.anno.links[0].target;
            window.open(`?userid=&fileid=${file}&anchor=${target}`, "_blank");
        }
    }

    const handleRightClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const selection = window.getSelection();
        if (selectionIsEmpty(selection)) {
            setPos({ left: e.pageX, top: e.pageY });
            const annotations = props.annotations.filter((s: TextSpan) => { return props.start >= s.start && props.end <= s.end });
            setHoveredAnnotations(annotations);
            setMenuOpen(true);
        }
    };

    const handleClose = () => { setMenuOpen(false); };

    const toggleSelected = (index: number) => {
        if (selected == index) {
            setSelected(-1);
        } else {
            setSelected(index);
        }
    }


    const Row = ({ annotation, index }: { annotation: TextSpan, index: number }) => {
        const [linksOpen, setLinksOpen] = useState<boolean>(props.openLinkMenuByDefault);
        const handleLinkButtonPress = (e) => {
            setLinksOpen(!linksOpen);
            e.stopPropagation();
        }

        return (
            <Card
                style={{
                    backgroundColor: "var(--secondary-background-color)",
                    border: "1px solid black",
                    // borderRadius: "5px",
                    width: "100%",
                    maxHeight: "300px",
                    overflow: "scroll",
                }}
            >
                <Grid container spacing={1}>
                    <Grid item xs={2}>
                        <CardActions disableSpacing>
                            {/* Link button */}
                            <IconButton onClick={(e) => { handleLinkButtonPress(e) }}> <BoltIcon /> </IconButton>

                            {/* Delete button */}
                            <IconButton size="small" onClick={(e) => props.deleteAnnotation(annotation, index)}> <DeleteIcon /> </IconButton>
                        </CardActions>
                    </Grid>

                    <Grid item xs={3} >
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
                    <Grid item xs={12} >
                        {/* Link menu card*/}
                        <Collapse in={linksOpen} timeout="auto" unmountOnExit orientation="vertical" collapsedSize={0}>
                            <CardContent>
                                <LinkMenu
                                    left={0}
                                    top={0}
                                    colors={props.colors}
                                    selectedAnnotation={annotation}
                                    annotations={props.annotations}
                                    otherFileAnnotations={props.otherFileAnnotations}
                                    toggleLink={props.toggleLink}
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
        <span data-start={props.start} data-end={props.end} >
            <span
                onContextMenu={handleRightClick}
                onDoubleClick={(e) => handleJumpClick(e)}
                data-start={props.start}
                data-end={props.end}
            >
                {props.innerContent}
            </span>
            <Popover
                open={menuOpen}
                onClose={handleClose}
                anchorPosition={pos}
                anchorReference="anchorPosition"
                onKeyDown={(e) => { e.stopPropagation(); }}
                disableScrollLock={true}
                style={{
                    position: "absolute",
                }}
            >
                {hoveredAnnotations.map((annotation, index) => {
                    return (
                        <MenuItem
                            style={{
                                backgroundColor: "#00000000",
                                width: "600px",
                                padding: "0px",
                                margin: "0px",
                            }}
                            key={crypto.randomUUID()}
                        >
                            <Row annotation={annotation} index={index} />
                        </MenuItem >
                    );
                }
                )}
            </Popover >
        </span >
    );
}
export default MarkMenu;
