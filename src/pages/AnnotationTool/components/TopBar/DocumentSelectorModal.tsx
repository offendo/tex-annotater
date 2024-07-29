import * as React from "react";
import { useSearchParams } from "react-router-dom";
import TextField from "@mui/material/TextField";
import { GlobalState, loadAnnotations, loadDocument } from "@/lib/GlobalState";
import { Typography, Button, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Grid, ListSubheader, Collapse } from "@mui/material";
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import fuzzysort from "fuzzysort";
import FileOpenIcon from '@mui/icons-material/FileOpen';
import DownloadIcon from '@mui/icons-material/Download';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import { orderBy, groupBy, sortBy, maxBy, minBy } from "lodash";
import { MenuItemProps } from "./MenuItemProps";
import { SaveSelector } from "./SaveSelector";


export const DocumentSelectorModal = (props: MenuItemProps) => {
    const state = React.useContext(GlobalState);
    const theme = useTheme();

    const [query, setQuery] = React.useState("");
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);
    const [selectedDoc, setSelectedDoc] = React.useState<number>(-1);
    const [documentSelectorOpen, setDocumentSelectorOpen] = React.useState<boolean>(true);
    const [saveSelectorOpen, setSaveSelectorOpen] = React.useState<boolean>(false);

    async function listAllDocuments() {
        try {
            const response = await fetch("/api/documents", { mode: "cors" });
            const res = await response.json();
            setDocuments(res["documents"]);
        } catch (e) {
            console.error(e);
        }
    }
    const selectDocument = (doc: any, index: number) => {
        setSelectedDoc(index);
        if (doc.name == null) { return; }
        loadDocument(state, doc.name);
        setQueryParameters({ fileid: doc.name })
        state.setFileId(doc.name);
    };

    const handleClose = (e: any) => {
        props.setIsOpen(false);
        e.stopPropagation();
    };
    const handleDocumentSelectorClick = (e: any) => {
        const isOpen = documentSelectorOpen;
        setDocumentSelectorOpen(!isOpen);
        if (isOpen) {
            setSaveSelectorOpen(true);
        }
    };
    const handleSaveSelectorClick = (e: any) => {
        const isOpen = saveSelectorOpen;
        setSaveSelectorOpen(!isOpen);
        if (isOpen) {
            setDocumentSelectorOpen(true);
        }
    };

    const onSelectSave = (save: any, index: number) => {
        loadAnnotations(state, save["fileid"], save["userid"], save["timestamp"], save["savename"]);
        setQueryParameters({ fileid: save['fileid'], timestamp: save['timestamp'], savename: save['savename'] })
    };

    // Load documents immediately
    React.useEffect(() => { listAllDocuments(); }, []);

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
                <Button onClick={handleSaveSelectorClick}>
                    {saveSelectorOpen ? <ExpandLess /> : <ExpandMore />} Toggle saves
                </Button>
                <TextField
                    autoFocus
                    size="small"
                    variant="outlined"
                    fullWidth
                    label="Search documents"
                    onChange={(e) => { setQuery(e.target.value) }}
                />
                <IconButton onClick={handleClose}>
                    <CloseIcon />
                </IconButton>
            </DialogActions>
            <DialogContent>
                <Box
                    sx={{
                        width: 1200,
                        minWidth: 1200,
                        maxHeight: 500,
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
                                <Grid container>
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
                                            onClick={(e) => { selectDocument(doc, index); setSaveSelectorOpen(true); }}
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
                <Collapse in={saveSelectorOpen} timeout="auto" >
                    <SaveSelector onSelectSave={onSelectSave} />
                </Collapse>
            </DialogContent>
        </Dialog >
    );
}
