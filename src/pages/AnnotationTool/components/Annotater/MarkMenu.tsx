import React, { useState, useRef } from "react";
import { TextSpan, Link } from "@/lib/span";
import {
    Card,
    CardActions,
    CardContent,
    Grid,
    IconButton,
    Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import BoltIcon from "@mui/icons-material/Bolt";
import AddLinkIcon from "@mui/icons-material/AddLink";
import Collapse from "@mui/material/Collapse";
import LinkMenu from "./LinkMenu";
import { selectionIsEmpty, shortenText } from "@/lib/utils";

import Popover from "@mui/material/Popover";
import MenuItem from "@mui/material/MenuItem";
import { Resizable } from "re-resizable";

export interface MarkMenuProps {
    anno: TextSpan;
    innerContent: any;
    colors: any;
    start: number;
    end: number;
    annotations: TextSpan[];
    saveid: string;
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
    const [hoveredAnnotations, setHoveredAnnotations] = useState<TextSpan[]>(
        [],
    );

    const handleJumpClick = (e: any) => {
        if (props.anno.links.length > 0) {
            const file = props.anno.links[0].fileid;
            const target = props.anno.links[0].target;
            fetch(`/api/savename?annoid=${target}`).then(res => res.json()).then((result: any) => {
                const timestamp = result['timestamp'];
                console.log(result)
                window.open(
                    `?userid=&fileid=${file}&anchor=${target}&saveid=${timestamp}`,
                    "_blank",
                );
            });
        }
    };

    const handleRightClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const selection = window.getSelection();
        if (selectionIsEmpty(selection)) {
            setPos({ left: e.pageX, top: e.pageY });
            const annotations = props.annotations.filter((s: TextSpan) => {
                return props.start >= s.start && props.end <= s.end;
            });
            setHoveredAnnotations(annotations);
            setMenuOpen(true);
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
    };

    const Row = ({
        annotation,
        index,
    }: {
        annotation: TextSpan;
        index: number;
    }) => {
        const [linksOpen, setLinksOpen] = useState<boolean>(
            props.openLinkMenuByDefault,
        );
        const handleLinkButtonPress = (e) => {
            setLinksOpen(!linksOpen);
            e.stopPropagation();
        };

        return (
            <Resizable
                defaultSize={{
                    width: "600px",
                    height: "fit-content",
                }}
                maxHeight={500}
                style={{
                    backgroundColor: "var(--secondary-background-color)",
                    border: "1px solid black",
                    borderRadius: "5px",
                    maxHeight: "500px",
                    overflowY: "scroll",
                }}
                onMouseDown={(e) => { e.stopPropagation(); }}
            >
                <Grid container spacing={1}>
                    <Grid item xs={2} style={{ margin: "auto", paddingLeft: "5px" }}>
                        {/* Link button */}
                        <IconButton
                            onClick={(e) => {
                                handleLinkButtonPress(e);
                            }}
                        >
                            {" "}
                            <AddLinkIcon />{" "}
                        </IconButton>

                        {/* Delete button */}
                        <IconButton
                            size="small"
                            onClick={(e) =>
                                props.deleteAnnotation(annotation, index)
                            }
                        >
                            {" "}
                            <DeleteIcon />{" "}
                        </IconButton>
                    </Grid>

                    <Grid item xs={3} style={{ margin: "auto" }}>
                        <div>
                            {/* Tag name */}
                            <span
                                style={{ margin: "auto", color: props.colors[annotation.tag] }}
                            >
                                {`${annotation.tag}`}
                            </span>
                        </div>
                    </Grid>
                    <Grid item xs={7} style={{ margin: "auto" }}>
                        <div>
                            {/* Content */}
                            <span
                                className="expand-text"
                                style={{
                                    minWidth: "300px",
                                }}
                            >
                                <Tooltip title="Click to expand">
                                    <pre
                                        style={{
                                            whiteSpace: "pre-wrap",
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelected(index);
                                        }}
                                    >
                                        {selected == index
                                            ? `${annotation.text}`
                                            : shortenText(annotation.text, 25, true)}
                                    </pre>
                                </Tooltip>
                            </span>
                        </div>
                    </Grid>
                    <Grid item xs={12}>
                        {/* Link menu card*/}
                        <Collapse
                            in={linksOpen}
                            timeout="auto"
                            unmountOnExit
                            orientation="vertical"
                            collapsedSize={0}
                        >
                            <div>
                                <LinkMenu
                                    left={0}
                                    top={0}
                                    colors={props.colors}
                                    selectedAnnotation={annotation}
                                    annotations={props.annotations}
                                    toggleLink={props.toggleLink}
                                    onDeletePress={() => {}}
                                />
                            </div>
                        </Collapse>
                    </Grid>
                </Grid>
            </Resizable>
        );
    };

    return (
        <span data-start={props.start} data-end={props.end}>
            <span
                onContextMenu={handleRightClick}
                onClick={(e) => {
                    if (e.altKey) {
                        handleJumpClick(e);
                    }
                }}
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
                onKeyDown={(e) => {
                    e.stopPropagation();
                }}
                disableScrollLock={true}
                style={{
                    position: "absolute",
                    padding: "10px"
                }}
            >
                {hoveredAnnotations.map((annotation, index) => {
                    return (
                        <MenuItem
                            style={{
                                backgroundColor: "#00000000",
                                padding: "0px",
                                margin: "0px",
                            }}
                            key={crypto.randomUUID()}
                        >
                            <Row annotation={annotation} index={index} />
                        </MenuItem>
                    );
                })}
            </Popover>
        </span>
    );
}
export default MarkMenu;
