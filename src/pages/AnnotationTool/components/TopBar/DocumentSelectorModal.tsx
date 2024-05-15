import * as React from "react";
import { useSearchParams } from "react-router-dom";
import TextField from "@mui/material/TextField";
import { GlobalState, loadAnnotations, loadDocument } from "@/lib/GlobalState";
import { Typography, Button, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Grid, ListSubheader } from "@mui/material";
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import fuzzysort from "fuzzysort";
import FileOpenIcon from '@mui/icons-material/FileOpen';
import CloseIcon from '@mui/icons-material/Close';
import { orderBy } from "lodash";
import { SaveFileSelector } from "./SaveFileSelector";
import { MenuItemProps } from "./MenuItemProps";

export const DocumentSelectorModal = (props: MenuItemProps) => {
    const state = React.useContext(GlobalState);
    const theme = useTheme();

    const [query, setQuery] = React.useState("");
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);
    const [saves, setSaves] = React.useState<any[]>([]);
    const [selectedSave, setSelectedSave] = React.useState<number>(-1);
    const [selectedDoc, setSelectedDoc] = React.useState<number>(-1);

    async function listAllDocuments() {
        try {
            const response = await fetch("/api/document/all", { mode: "cors" });
            const res = await response.json();
            setDocuments(res["documents"]);
        } catch (e) {
            console.error(e);
        }
    }
    const loadSaves = async (fileid: string) => {
        try {
            const res = await fetch(`/api/saves?fileid=${fileid}`, { mode: "cors" });
            const json = await res.json();
            setSaves(json["saves"]);
        } catch (e) {
            console.error(e)
            setSaves([])
        }
    };

    const selectSave = (save: any, index: number) => {
        setSelectedSave(index);
        loadAnnotations(state, save["fileid"], save["userid"], save["timestamp"]);
        setQueryParameters({ fileid: save['fileid'], saveid: save['timestamp'] })
    };
    const selectDocument = (doc: any, index: number) => {
        setSelectedDoc(index);
        if (doc.name == null) { return; }
        loadDocument(state, doc.name);
        setQueryParameters({ fileid: doc.name })
        state.setFileId(doc.name);
    };

    const handleClose = (e) => {
        props.setIsOpen(false);
        e.stopPropagation();
    };

    // Load documents immediately
    React.useEffect(() => { listAllDocuments(); }, []);

    // Load saves whenever the fileid changes
    React.useEffect(() => { loadSaves(state.fileid); }, [state.fileid, state.annotations])

    const filterSearch = (docs: any[], query: string) => {
        return query.length == 0
            ? docs
            : fuzzysort.go(query, docs, { keys: ["filename", "arxiv_id"] }).map((t) => t.obj);
    };

    return (
        <Dialog
            open={props.isOpen}
            onClose={handleClose}
            keepMounted
            fullWidth={false}
            maxWidth={'xl'}
            sx={{ overflowX: "hidden", overflowY: "hidden" }}
        >
            <DialogActions >
                <TextField
                    autoFocus
                    size="small"
                    variant="outlined"
                    fullWidth
                    label="Search documents"
                    sx={{ m: "10px" }}
                    onChange={(e) => { setQuery(e.target.value) }}
                />
                <IconButton onClick={handleClose}>
                    <CloseIcon />
                </IconButton>
            </DialogActions>
            <DialogContent>
                <Typography variant="h6"> Open document </Typography>
                <Box
                    sx={{
                        width: 1000,
                        maxHeight: 300,
                        height: "fit-content",
                        backgroundColor: theme.palette.background.default,
                        overflowY: "scroll",
                        fontFamily: theme.typography.fontFamily,
                        fontSize: "12pt",
                    }}
                >
                    <Grid container>
                        <List dense sx={{ width: "100%" }}>
                            <ListSubheader >
                                <Grid container key={crypto.randomUUID()}>
                                    <Grid item xs={2}>
                                        Arxiv ID
                                    </Grid>
                                    <Grid item xs={5}>
                                        File name
                                    </Grid>
                                    <Grid item xs={3}>
                                        Upload date
                                    </Grid>
                                    <Grid item xs={2}>
                                        Size
                                    </Grid>
                                </Grid>
                            </ListSubheader>
                            {
                                filterSearch(orderBy(documents, ['arxiv_id', 'filename'], 'asc'), query).map((doc: any, index: number) => {
                                    return (
                                        <ListItem
                                            key={doc.arxiv_id + doc.filename}
                                            value={doc.name}
                                            onClick={(e) => { selectDocument(doc, index); }}
                                        >
                                            <ListItemButton disableGutters selected={selectedDoc === index}>
                                                <Grid container >
                                                    <Grid item xs={2}>
                                                        {doc.arxiv_id}
                                                    </Grid>
                                                    <Grid item xs={5} style={{ overflowX: "scroll" }}>
                                                        {doc.filename}
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        {doc.modified}
                                                    </Grid>
                                                    <Grid item xs={2}>
                                                        {doc.size} kb
                                                    </Grid>
                                                </Grid>
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })
                            }
                        </List>
                    </Grid>
                </Box>
                <Typography variant="h6" sx={{ m: "5px" }}> Load save </Typography>
                <Box
                    sx={{
                        width: 1000,
                        maxHeight: 200,
                        height: "fit-content",
                        backgroundColor: theme.palette.background.default,
                        overflowY: "scroll",
                        fontFamily: theme.typography.fontFamily,
                        fontSize: "12pt",
                    }}
                >
                    <Grid container>
                        <List dense sx={{ width: "100%" }}>
                            <ListSubheader >
                                <Grid container key={crypto.randomUUID()}>
                                    <Grid item xs={3}>
                                        User ID
                                    </Grid>
                                    <Grid item xs={4}>
                                        Save Name
                                    </Grid>
                                    <Grid item xs={3}>
                                        Timestamp
                                    </Grid>
                                    <Grid item xs={2}>
                                        # Annotations
                                    </Grid>
                                </Grid>
                            </ListSubheader>
                            {
                                orderBy(saves, ['timestamp'], 'desc').map((save: any, index: number) => {
                                    return (
                                        <ListItem
                                            key={save.timestamp + `index:${index}`}
                                            value={save.timestamp}
                                            onClick={(e) => {
                                                selectSave(save, index);
                                            }}
                                        >
                                            <ListItemButton disableGutters selected={selectedSave === index}>
                                                <Grid container >
                                                    <Grid item xs={3}>
                                                        {save.userid}
                                                    </Grid>
                                                    <Grid item xs={4}>
                                                        {save.savename}
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        {save.timestamp}
                                                    </Grid>
                                                    <Grid item xs={2}>
                                                        {save.count}
                                                    </Grid>
                                                </Grid>
                                            </ListItemButton>
                                        </ListItem>
                                    );
                                })
                            }
                        </List>
                    </Grid>
                </Box>
            </DialogContent>
        </Dialog>
    );
}
