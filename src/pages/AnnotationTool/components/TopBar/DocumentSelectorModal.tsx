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


export const DocumentSelectorModal = (props: MenuItemProps) => {
    const state = React.useContext(GlobalState);
    const theme = useTheme();

    const [query, setQuery] = React.useState("");
    const [selectedSaveGroup, setSelectedSaveGroup] = React.useState(-1);
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);
    const [saves, setSaves] = React.useState<any[]>([]);
    const [selectedSave, setSelectedSave] = React.useState<number>(-1);
    const [selectedDoc, setSelectedDoc] = React.useState<number>(-1);
    const tokenizers = [
        { name: "Llemma 7b", id: "EleutherAI/llemma_7b" },
        { name: "Llemma 34b", id: "EleutherAI/llemma_34b" },
        // { name: "Llama-3 8b Instruct", id: "meta-llama/Meta-Llama-3-8B-Instruct" }
    ]

    async function listAllDocuments() {
        try {
            const response = await fetch("/api/documents", { mode: "cors" });
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
            // Group results by savename, which aren't unique anymore
            const groupedSaves = Object.values(groupBy(json['saves'], "savename"));
            const sortedSaves = orderBy(groupedSaves, (savelist) => { return maxBy(savelist, "timestamp").timestamp }, 'desc')
            setSaves(sortedSaves);
        } catch (e) {
            console.error(e)
            setSaves([])
        }
    };
    const exportAnnotations = async (userid: string, fileid: string, timestamp: string, tokenizer?: string) => {
        try {
            if (!tokenizer) {
                tokenizer = "EleutherAI/llemma_7b"
            }
            tokenizer = encodeURI(tokenizer)
            const res = await fetch(`/api/export?fileid=${fileid}&userid=${userid}&timestamp=${timestamp}&tokenizer=${tokenizer}`, { mode: "cors" });
            const text = await res.file();
            console.log(text);
        } catch (e) {
            console.error(e);
        }
    };

    const handleSaveGroupClick = (index: number) => {
        if (selectedSaveGroup != index) {
            setSelectedSaveGroup(index);
        } else {
            setSelectedSaveGroup(-1);
        }
    }


    const selectSave = (save: any, index: number) => {
        setSelectedSave(index);
        loadAnnotations(state, save["fileid"], save["userid"], save["timestamp"], save["savename"]);
        setQueryParameters({ fileid: save['fileid'], timestamp: save['timestamp'], savename: save['savename'] })
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
    React.useEffect(() => {
        loadSaves(state.fileid);
    },
        [state.fileid, state.annotations, state.savename]
    )

    const filterSearch = (docs: any[], query: string) => {
        return query.length == 0
            ? docs
            : fuzzysort.go(query, docs, { keys: ["filename", "arxiv_id"] }).map((t) => t.obj);
    };

    const [tokenizerMenuAnchorEl, setTokenizerMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const tokenizerMenuOpen = Boolean(tokenizerMenuAnchorEl);

    const handleTokenizerMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setTokenizerMenuAnchorEl(event.currentTarget);
    };
    const handleTokenizerMenuClose = () => {
        setTokenizerMenuAnchorEl(null);
    };

    const toggleIsFinal = async (timestamp, savename, userid, fileid) => {
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json", mode: "cors" },
        };
        const response = await fetch(`/api/finalize?timestamp=${timestamp}&savename=${savename}&userid=${userid}&fileid=${fileid}`, requestOptions);
        const json = await response.json();
        loadSaves(state.fileid);
        return;
    }

    const makeSubSaveList = (savelist: any[], saveGroupIndex: number) => {
        let total = savelist.length;
        let index = 0;
        for (const save of savelist) {
            if (save.autosave == 0) {
                index += 1;
                save.saveIndex = index;
            } else {
                save.saveIndex = -1;
                total -= 1;
            }
        }
        return (
            savelist.map((save: any, index: number) => {
                return (
                    <ListItem
                        key={save.timestamp + `groupIndex:${saveGroupIndex}:${index}`}
                        style={{ backgroundColor: "var(--solarized-base3)" }}
                        value={save.timestamp}
                        onClick={(e) => {
                            selectSave(save, index);
                        }}
                        disableGutters
                        disablePadding
                    >
                        <ListItemButton selected={selectedSave === index && selectedSaveGroup === saveGroupIndex}>
                            <Grid container >
                                <Grid item xs={1}>
                                    <IconButton
                                        id={save.timestamp + `groupIndex:${saveGroupIndex}:${index}`}
                                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                        onClick={(e) => {
                                            handleTokenizerMenuClick(e);
                                            e.stopPropagation();
                                        }}
                                        style={{ padding: "0px" }}
                                    >
                                        <DownloadIcon />
                                    </IconButton>
                                    <Menu
                                        anchorEl={tokenizerMenuAnchorEl}
                                        open={tokenizerMenuOpen}
                                        onClose={handleTokenizerMenuClose}
                                    >
                                        {
                                            tokenizers.map(({ name, id }) => {
                                                return (
                                                    <MenuItem
                                                        key={`name:${name}id:${id}`}
                                                        component="a"
                                                        href={`/api/export?fileid=${state.fileid}&userid=${save.userid}&timestamp=${save.timestamp}&tokenizer=${id}`}
                                                        onClick={handleTokenizerMenuClose}
                                                    >
                                                        {name}
                                                    </MenuItem>
                                                );
                                            })
                                        }
                                    </Menu>
                                </Grid>
                                <Grid item xs={1}>
                                    <IconButton
                                        onMouseDown={(e) => { e.stopPropagation() }}
                                        onClick={(e) => { e.stopPropagation(); toggleIsFinal(save.timestamp, save.savename, save.userid, save.fileid) }}
                                        style={{ padding: "0px" }}
                                    >
                                        {save.final ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                    </IconButton>
                                </Grid>
                                <Grid item xs={3}>
                                    {save.autosave ? "autosave" : `version ${total - save.saveIndex}`}
                                </Grid>
                                <Grid item xs={2}>
                                    {save.userid}
                                </Grid>
                                <Grid item xs={3}>
                                    {save.timestamp}
                                </Grid>
                                <Grid item xs={2}>
                                    {save.count}
                                </Grid>
                            </Grid>
                        </ListItemButton>
                    </ListItem >
                );
            })
        );
    }

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
                        <List disablePadding dense sx={{ width: "100%" }}>
                            <ListSubheader >
                                <Grid container>
                                    <Grid item xs={1}>
                                        Export
                                    </Grid>
                                    <Grid item xs={1}>
                                        Mark Final
                                    </Grid>
                                    <Grid item xs={3}>
                                        Save Name
                                    </Grid>
                                    <Grid item xs={2}>
                                        Last User ID
                                    </Grid>
                                    <Grid item xs={3}>
                                        Last Timestamp
                                    </Grid>
                                    <Grid item xs={2}>
                                        Last # Annotations
                                    </Grid>
                                </Grid>
                            </ListSubheader>
                            {
                                saves.map((savelist: any[], index: number) => {
                                    return (
                                        <div key={index}>
                                            <ListItemButton selected={selectedSaveGroup == index} onClick={(e) => handleSaveGroupClick(index)}>
                                                <Grid container >
                                                    <Grid item xs={2}>
                                                        {selectedSaveGroup == index ? <ExpandLess /> : <ExpandMore />}
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        {savelist[0].savename}
                                                    </Grid>
                                                    <Grid item xs={2}>
                                                        {savelist[0].userid}
                                                    </Grid>
                                                    <Grid item xs={3}>
                                                        {savelist[0].timestamp}
                                                    </Grid>
                                                    <Grid item xs={2}>
                                                        {savelist[0].count}
                                                    </Grid>
                                                </Grid>
                                            </ListItemButton>
                                            <Collapse in={selectedSaveGroup == index} timeout="auto" unmountOnExit>
                                                <List disablePadding>
                                                    {makeSubSaveList(savelist, index)}
                                                </List>
                                            </Collapse>
                                        </div>
                                    )
                                })
                            }
                        </List>
                    </Grid>
                </Box>
            </DialogContent>
        </Dialog >
    );
}
