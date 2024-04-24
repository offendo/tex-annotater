import * as React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Checkbox, Divider, IconButton, Input, SnackbarContent, Tooltip } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
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
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from "@mui/material/Menu";
import { TextSpan } from "@/lib/span";
import { ColorMap, defaultColorMap } from "@/lib/colors";
import { jumpToElement, shortenText } from "@/lib/utils";
import { Grid } from "@mui/material";
import sortBy from "lodash.sortby";
import { Status, GlobalState, loadAnnotations, loadDocument, saveAnnotations } from "./GlobalState";
import RemoveIcon from '@mui/icons-material/Remove';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import ErrorIcon from '@mui/icons-material/Error';
import AddIcon from '@mui/icons-material/Add';
import usePatterns from "@/pages/Patterns";
import { useTraceUpdate } from "@/pages/Tracker";

type SaveFileProps = {};

const SaveFileSelector = (props: SaveFileProps) => {
    const state = React.useContext(GlobalState);
    const [selected, setSelected] = React.useState("");
    const [saves, setSaves] = React.useState<any[]>([]);

    const [queryParameters, setQueryParameters] = useSearchParams();

    const handleChange = (event: SelectChangeEvent) => {
        if (event.target.value == "empty") {
            loadAnnotations(state, "", "", "", true);
            setSelected(event.target.value);
            return;
        }
        const s = JSON.parse(event.target.value);
        setSelected(event.target.value);
        loadAnnotations(state, s["fileid"], s["userid"], s["timestamp"]);
        setQueryParameters({ fileid: s['fileid'], saveid: s['timestamp'] })
    };

    const loadSaves = (fileid: string) => {
        fetch(`/api/saves?fileid=${fileid}`, { mode: "cors" })
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
        loadSaves(state.fileid);
        const saveid = queryParameters.get('saveid') || "";
        loadAnnotations(state, state.fileid, state.userid, saveid);
        setQueryParameters({ ...queryParameters, fileid: state.fileid, saveid: saveid, anchor: state.anchor })
    }, [state.fileid]);

    React.useEffect(() => {
        loadSaves(state.fileid);
    }, [state.saveid]);

    return (
        <Box sx={{ minWidth: 200, marginLeft: "20px", marginRight: "20px" }}>
            <FormControl fullWidth variant="filled">
                <InputLabel variant="filled" id="demo-simple-select-label">
                    {"Load annotations"}
                </InputLabel>
                <Select
                    value={selected}
                    sx={{ width: 300 }}
                    label="save"
                    onChange={handleChange}
                >
                    <MenuItem key={"empty-annotations"} value={"empty"}>
                        {"Clear annotations"}
                    </MenuItem>
                    {saves.map((item) => {
                        return (
                            <MenuItem
                                key={crypto.randomUUID()}
                                value={JSON.stringify(item)}
                            >
                                {item.savename == 'autosave' ? `[${item.userid}] autosave` : `[${item.userid}] ${item.timestamp}:  ${item.savename}`}
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>
        </Box>
    );
};

type TopBarProps = {};

export default function TopBar(props: TopBarProps) {
    const state = React.useContext(GlobalState);
    // useTraceUpdate(props);

    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);
    const [didSave, setDidSave] = React.useState(false);
    const [message, setMessage] = React.useState("");

    // Functionality stuff
    const handleAlertClose = (e: any) => {
        setMessage("");
        setDidSave(false);
    };
    const handleStatusClose = (e: any) => {
        state.setStatus(Status.Ready);
    }

    async function listAllDocuments() {
        try {
            const response = await fetch("/api/document/all", { mode: "cors" });
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
    const { regexPatterns, setRegexPatterns } = usePatterns();
    const { patterns, selectedPatterns } = regexPatterns;

    // Regex Menu
    const handleRegexMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { setRegexMenuAnchorEl(event.currentTarget); };
    const handleRegexMenuClose = () => { setRegexMenuAnchorEl(null); };
    const [regexMenuAnchorEl, setRegexMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const regexMenuOpen = Boolean(regexMenuAnchorEl);

    /* Annotation list at the top of the bar */
    const handleAnnotationMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { setAnnotationMenuAnchorEl(event.currentTarget); };
    const handleAnnotationMenuClose = () => { setAnnotationMenuAnchorEl(null); };
    const [annotationMenuAnchorEl, setAnnotationMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const annotationMenuOpen = Boolean(annotationMenuAnchorEl);

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
                        className={"expand-text"}
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

    const toggleRegexPattern = (value: string) => {
        const currentIndex = selectedPatterns.indexOf(value);
        const newSelections = [...selectedPatterns];
        if (currentIndex === -1) {
            newSelections.push(value);
        } else {
            newSelections.splice(currentIndex, 1);
        }

        setRegexPatterns({ patterns: patterns, selectedPatterns: newSelections });
    };
    const removeRegexPattern = (regex: string) => {
        const currentIndex = patterns.indexOf(regex);
        const newPatterns = [...patterns];
        if (currentIndex !== -1) {
            newPatterns.splice(currentIndex, 1);
            const selIndex = selectedPatterns.indexOf(regex);
            if (selIndex !== -1) {
                selectedPatterns.splice(selIndex, 1);
            }
        }
        setRegexPatterns({ patterns: newPatterns, selectedPatterns: selectedPatterns });
    }

    const addRegexPattern = (regex: string) => {
        const currentIndex = patterns.indexOf(regex);
        const newPatterns = [...patterns];
        if (currentIndex === -1) {
            newPatterns.push(regex);
            selectedPatterns.push(regex);
        }
        setRegexPatterns({ patterns: newPatterns, selectedPatterns: selectedPatterns });
    }

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
                    <span>
                        <Button
                            size="large"
                            color="inherit"
                            onClick={handleRegexMenuClick}
                        >
                            {regexMenuOpen ? (
                                <ExpandLessIcon style={{ padding: "5px" }} />
                            ) : (
                                <ExpandMoreIcon style={{ padding: "5px" }} />
                            )}
                            {"Modify AutoLink Regex"}
                        </Button>
                        <Menu
                            id="basic-menu"
                            anchorEl={regexMenuAnchorEl}
                            open={regexMenuOpen}
                            onClose={handleRegexMenuClose}
                            MenuListProps={{
                                "aria-labelledby": "basic-button",
                                style: {
                                    backgroundColor: "var(--background-color)",
                                    margin: "0px",
                                    padding: "0px",
                                },
                            }}
                        >
                            {
                                patterns.map((regex) => {
                                    return (
                                        <ListItem
                                            key={crypto.randomUUID()}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="remove" onClick={(e) => { removeRegexPattern(regex) }}>
                                                    <RemoveIcon />
                                                </IconButton>
                                            }
                                            disablePadding
                                        >
                                            <ListItemButton onClick={(e) => { toggleRegexPattern(regex) }} dense>
                                                <ListItemIcon>
                                                    <Checkbox
                                                        edge="start"
                                                        checked={selectedPatterns.indexOf(regex) !== -1}
                                                        tabIndex={-1}
                                                        disableRipple
                                                    />
                                                </ListItemIcon>
                                                <ListItemText id={regex} primary={regex} />
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })
                            }
                            {
                                <ListItem
                                    key={crypto.randomUUID()}
                                    disablePadding
                                >
                                    <ListItemButton
                                        dense
                                        onClick={(e) => {
                                            const el = document.getElementById("newpattern");
                                            addRegexPattern(el.value);
                                        }}
                                    >
                                        <ListItemIcon>
                                            <AddIcon />
                                        </ListItemIcon>
                                        <TextField
                                            size="small"
                                            margin="dense"
                                            id="newpattern" label="Add new regex" variant="standard"

                                            onClick={(e) => { e.stopPropagation(); }}
                                            onMouseDown={(e) => { e.stopPropagation(); }}
                                            onKeyDown={(e) => { e.stopPropagation(); }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            }

                        </Menu>
                    </span>
                    <Button
                        size="large"
                        color="inherit"
                        aria-label="save annotations"
                        sx={{ mr: 2 }}
                        onClick={async (e) => {
                            const annos = await saveAnnotations(state, state.annotations, false);
                            setDidSave(annos != null);
                            setMessage(
                                annos
                                    ? "Successfully saved"
                                    : "Error: please see console",
                            );
                        }}
                    >
                        <SaveIcon style={{ padding: "5px" }} />
                        {"Save"}
                    </Button>
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
                            {"Show annotations "}
                        </Button>
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
                            {state.annotations.map((anno, index) => {
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
                                    value={state.fileid}
                                    onChange={(e: React.SyntheticEvent, value: string | null) => {
                                        if (value == null) {
                                            return;
                                        }
                                        loadDocument(state, value);
                                        setQueryParameters({ fileid: value, saveid: state.saveid })
                                        state.setFileId(value);
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
                            <SaveFileSelector />
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
        </Box >
    );
}
