import * as React from "react";
import { Divider } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import { TextSpan } from "@/lib/span";
import { ColorMap, defaultColorMap } from "@/lib/colors";
import { jumpToElement } from "@/lib/utils";
import { Grid } from "@mui/material";
import sortBy from "lodash.sortby";

type SaveFileProps = {
    fileid: string;
    userid: string;
    loadAnnotations: (
        fileid: string,
        userid: string,
        timestamp?: string,
    ) => any;
};

const SaveFileSelector = (props: SaveFileProps) => {
    const [selected, setSelected] = React.useState("");
    const [saves, setSaves] = React.useState<any[]>([]);

    const handleChange = (event: SelectChangeEvent) => {
        const s = JSON.parse(event.target.value);
        setSelected(event.target.value);
        props.loadAnnotations(s["fileid"], s["userid"], s["timestamp"]);
    };

    const loadSaves = (fileid: string) => {
        fetch(`http://localhost:5000/saves?fileid=${fileid}`)
            .then((res) => res.json())
            .then((res) => {
                setSaves(res["saves"]);
            })
            .catch((error) => {
                console.log(error);
                setSaves([]);
            });
        return saves;
    };

    React.useEffect(() => {
        loadSaves(props.fileid);
        props.loadAnnotations(props.fileid, props.userid);
    }, [props.fileid, props.userid]);

    return (
        <Box sx={{ minWidth: 200, marginLeft: "20px", marginRight: "20px" }}>
            <FormControl fullWidth variant="filled">
                <InputLabel variant="filled" id="demo-simple-select-label">
                    Load annotations
                </InputLabel>
                <Select value={selected} label="save" onChange={handleChange}>
                    {saves.map((item) => {
                        return (
                            <MenuItem
                                key={crypto.randomUUID()}
                                value={JSON.stringify(item)}
                            >
                                {`${item["timestamp"]} (${item["userid"]})`}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        </Box>
    );
};

type TopBarProps = {
    userid: string;
    fileid: string;
    saveAnnotations: () => TextSpan[];
    loadAnnotations: (
        fileid: string,
        userid: string,
        timestamp?: string,
    ) => any;
    loadDocument: (fileid: string) => any;
};

export default function TopBar(props: TopBarProps) {
    const [fileid, setFileid] = React.useState(props.fileid);
    const [documents, setDocuments] = React.useState([]);
    const [didSave, setDidSave] = React.useState(false);
    const [message, setMessage] = React.useState("");

    // Functionality stuff
    const handleAlertClose = (e: any) => {
        setMessage("");
        setDidSave(false);
    };

    async function listAllDocuments() {
        try {
            const response = await fetch("http://localhost:5000/document/all");
            const res = await response.json();
            setDocuments(res["documents"]);
        } catch (e) {
            console.error(e);
        }
    }

    React.useEffect(() => {
        listAllDocuments();
    }, []);

    // Annotation list stuff
    const [annotations, setAnnotations] = React.useState<TextSpan[]>([]);
    const [selected, setSelected] = React.useState(-1);
    const [annotationMenuAnchorEl, setAnnotationMenuAnchorel] =
        React.useState<null | HTMLElement>(null);
    const annotationMenuOpen = Boolean(annotationMenuAnchorEl);

    const handleAnnotationMenuClick = (
        event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        setAnnotationMenuAnchorel(event.currentTarget);
    };

    const handleAnnotationMenuClose = () => {
        setAnnotationMenuAnchorel(null);
    };

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
        const toggleSelected = (index: number) => {
            if (selected == index) {
                setSelected(-1);
            } else {
                setSelected(index);
            }
        };

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
                        className={"expand-text"}
                        style={{ minWidth: "300px" }}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(index);
                        }}
                    >
                        <pre style={{ margin: "0px", whiteSpace: "pre-wrap" }}>
                            {selected == index
                                ? annotation.text
                                : `${annotation.text
                                      .slice(
                                          0,
                                          Math.min(30, annotation.text.length),
                                      )
                                      .trim()
                                      .replaceAll("\n", " ")}...`}
                        </pre>
                    </span>
                </Grid>
            </Grid>
        );
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar
                style={{
                    backgroundColor: "var(--solarized-base2)",
                    color: "var(--solarized-base03)",
                }}
                position="static"
            >
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="save annotations"
                        sx={{ mr: 2 }}
                        onClick={(e) => {
                            const annos = props.saveAnnotations();
                            setDidSave(annos != null);
                            setAnnotations(annos == null ? [] : annos);
                            setMessage(
                                annos
                                    ? "Successfully saved"
                                    : "Error: please see console",
                            );
                        }}
                    >
                        <SaveIcon />
                    </IconButton>
                    <span>
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="show annotations"
                            sx={{ mr: 2 }}
                            onClick={handleAnnotationMenuClick}
                        >
                            {annotationMenuOpen ? (
                                <ExpandLessIcon />
                            ) : (
                                <ExpandMoreIcon />
                            )}
                        </IconButton>
                        <Menu
                            id="basic-menu"
                            anchorEl={annotationMenuAnchorEl}
                            open={annotationMenuOpen}
                            onClose={handleAnnotationMenuClose}
                            MenuListProps={{
                                "aria-labelledby": "basic-button",
                                style: {
                                    backgroundColor: "var(--background-color)",
                                    margin: "0px",
                                    padding: "0px",
                                },
                            }}
                        >
                            {annotations.map((anno, index) => {
                                return (
                                    <MenuItem
                                        key={crypto.randomUUID()}
                                        style={{
                                            backgroundColor: "#00000000",
                                            width: "600px",
                                            padding: "10px",
                                            margin: "0px",
                                        }}
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
                    <Divider
                        style={{ color: "white", backgroundColor: "white" }}
                        orientation="vertical"
                    />
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            flexGrow: 1,
                            display: { xs: "none", sm: "block" },
                        }}
                        style={{ justifyContent: "center" }}
                    >
                        LaTeX Annotater
                    </Typography>
                    <div>
                        <span
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                            }}
                        >
                            <div>
                                <Autocomplete
                                    options={documents}
                                    sx={{ width: 300 }}
                                    value={fileid}
                                    onChange={(e) => {
                                        props.loadDocument(
                                            e.target.textContent,
                                        );
                                        setFileid(e.target.textContent);
                                    }}
                                    renderInput={(params: any) => (
                                        <TextField
                                            {...params}
                                            variant="filled"
                                            label="Load paper"
                                        />
                                    )}
                                />
                            </div>
                            <SaveFileSelector
                                fileid={fileid}
                                userid={props.userid}
                                loadAnnotations={(fid, uid, time) => {
                                    props
                                        .loadAnnotations(fid, uid, time)
                                        .then((annos: TextSpan[]) =>
                                            setAnnotations(
                                                sortBy(
                                                    annos,
                                                    (anno: TextSpan) =>
                                                        anno.start,
                                                ),
                                            ),
                                        );
                                }}
                            />
                        </span>
                    </div>
                </Toolbar>
            </AppBar>
            <Snackbar
                open={message != ""}
                autoHideDuration={4000}
                onClose={handleAlertClose}
            >
                <Alert
                    onClose={handleAlertClose}
                    severity={didSave ? "success" : "error"}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
