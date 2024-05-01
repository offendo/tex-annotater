import * as React from "react";
import { useSearchParams } from "react-router-dom";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import { GlobalState, loadDocument, loadAnnotations } from "@/lib/GlobalState";
import { Typography, Box, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, useTheme, Grid, ListSubheader } from "@mui/material";
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import fuzzysort from "fuzzysort";
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import usePatterns from "@/lib/Patterns";
import { orderBy } from "lodash";
import { SaveFileSelector } from "./SaveFileSelector";


export const DocumentSelectorMenuItem = () => {
    const state = React.useContext(GlobalState);
    const theme = useTheme();

    // Document Selector Modal
    const handleDocumentSelectorMenuClick = (event: any) => { setDocumentSelectorMenuAnchorEl(event.currentTarget); };
    const handleDocumentSelectorMenuClose = () => { setDocumentSelectorMenuAnchorEl(null); };
    const [documentSelectorMenuAnchorEl, setDocumentSelectorMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const documentSelectorMenuOpen = Boolean(documentSelectorMenuAnchorEl);
    const [query, setQuery] = React.useState("");

    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);

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


    const filterSearch = (docs: any[], query: string) => {
        return query.length == 0
            ? docs
            : fuzzysort.go(query, docs, { keys: ["filename", "arxivid"] }).map((t) => t.obj);
    };

    return (
        <div>
            <MenuItem onClick={handleDocumentSelectorMenuClick} >
                <ListItemIcon>
                    <FileOpenIcon />
                </ListItemIcon>
                <ListItemText>
                    Open Doc/Load Save
                </ListItemText>
                <Typography variant="body2" color="text.secondary">
                    ⌘O
                </Typography>
                <Dialog
                    open={documentSelectorMenuOpen}
                    onClose={handleDocumentSelectorMenuClose}
                    keepMounted
                    fullWidth={false}
                    maxWidth={'xl'}
                    sx={{ overflowX: "hidden", overflowY: "hidden" }}
                >
                    <DialogTitle>
                        Open document
                    </DialogTitle>
                    <DialogContent>
                        <div>
                            <TextField
                                size="small"
                                variant="outlined"
                                fullWidth
                                label="Search documents"
                                sx={{ m: "10px" }}
                                onChange={(e) => { setQuery(e.target.value) }}
                            />
                        </div>
                        <Box
                            sx={{
                                width: "700px",
                                height: 400,
                                backgroundColor: theme.palette.background.default,
                                m: "auto",
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
                                                    onClick={(e) => {
                                                        const value = doc.name;
                                                        if (value == null) {
                                                            return;
                                                        }
                                                        loadDocument(state, value);
                                                        setQueryParameters({ fileid: value })
                                                        state.setFileId(value);
                                                    }}
                                                >
                                                    <ListItemButton disableGutters >
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
                    </DialogContent>
                    <DialogActions >
                        <SaveFileSelector />
                    </DialogActions>
                </Dialog>
            </MenuItem>

        </div>
    );
}
