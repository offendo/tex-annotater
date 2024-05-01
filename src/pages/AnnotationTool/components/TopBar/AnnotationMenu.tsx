import * as React from "react";
import { Tooltip } from "@mui/material";
import Button from "@mui/material/Button";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import { TextSpan } from "@/lib/span";
import { ColorMap, defaultColorMap } from "@/lib/colors";
import { jumpToElement, shortenText } from "@/lib/utils";
import { Grid } from "@mui/material";
import { GlobalState } from "@/lib/GlobalState";


/* Annotation list at the top of the bar */
const AnnotationListRow = ({
    annotation,
    index,
    colors,
}: {
    annotation: TextSpan;
    index: number;
    colors: ColorMap;
}) => {
    return (
        <Grid
            container
            spacing={0}
            style={{ padding: "5px", margin: "2px" }}
        >
            <Grid item xs={3}>
                {/* Tag name */}
                <span style={{ color: (colors as any)[annotation.tag] }}>
                    {`${annotation.tag}`}
                </span>
            </Grid>
            <Grid item xs={7}>
                <span
                    style={{ minWidth: "300px" }}
                >
                    <Tooltip title={annotation.text} >
                        <pre style={{ margin: "0px", whiteSpace: "pre-wrap" }}>
                            {shortenText(annotation.text, 30, true)}
                        </pre>
                    </Tooltip>
                </span>
            </Grid>
        </Grid>
    );
};

export const AnnotationMenu = () => {
    const state = React.useContext(GlobalState)
    const handleAnnotationMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { setAnnotationMenuAnchorEl(event.currentTarget); };
    const handleAnnotationMenuClose = () => { setAnnotationMenuAnchorEl(null); };
    const [annotationMenuAnchorEl, setAnnotationMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const annotationMenuOpen = Boolean(annotationMenuAnchorEl);

    return (
        <span>
            <Button
                size="large"
                color="inherit"
                sx={{ mr: 2 }}
                onClick={handleAnnotationMenuClick}
                disabled={state.annotations.length == 0}
            >
                {annotationMenuOpen ? (
                    <ExpandLessIcon style={{ padding: "5px" }} />
                ) : (
                    <ExpandMoreIcon style={{ padding: "5px" }} />
                )}
                {"Go to annotation "}
            </Button>
            <Menu
                anchorEl={annotationMenuAnchorEl}
                open={annotationMenuOpen}
                onClose={handleAnnotationMenuClose}
            >
                {state.annotations.map((anno: TextSpan, index: number) => {
                    return (
                        <MenuItem
                            key={crypto.randomUUID()}
                            onClick={(e) => {
                                jumpToElement(anno.annoid);
                                handleAnnotationMenuClose();
                            }}
                        >
                            <AnnotationListRow
                                annotation={anno}
                                index={index}
                                colors={defaultColorMap}
                            />
                        </MenuItem>
                    );
                })}
            </Menu>
        </span>
    );
}
