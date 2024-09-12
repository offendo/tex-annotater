import { GlobalState, loadAnnotations, loadDocument } from "@/lib/GlobalState";
import CloseIcon from '@mui/icons-material/Close';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { Box, Button, Collapse, Dialog, DialogActions, DialogContent, Grid, IconButton, ListSubheader, useTheme } from "@mui/material";
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import TextField from "@mui/material/TextField";
import fuzzysort from "fuzzysort";
import { orderBy } from "lodash";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MenuItemProps } from "./MenuItemProps";
import { SaveSelector } from "./SaveSelector";


type Document = {
    name: string
    stem: string
    arxiv_id: string
    modified: string
    size: string
}

type DocumentSelectorProps = {
    documents: Document[]
    onSelect: (doc: any, index: number) => any
    filterFn: (docs: Document[]) => Document[]
}

export const DocumentSelector = (props: DocumentSelectorProps) => {
    const theme = useTheme();

    const state = React.useContext(GlobalState);
    const [selectedDoc, setSelectedDoc] = React.useState<number>(-1);

    React.useEffect(() => {
	if (state.fileid != null){
	    props.documents.map((doc, idx) => {
		if (doc.name == state.fileid){
                    setSelectedDoc(idx);
		}
	    });
	}
    }, [])

    return (
        <Box
            sx={{
                maxWidth: "50vw",
                maxHeight: 400,
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
                        props.filterFn(orderBy(props.documents, ['arxiv_id', 'stem'], 'asc')).map((doc: any, index: number) => {
                            return (
                                <ListItem
                                    key={doc.arxiv_id + doc.stem}
                                    value={doc.name}
                                    onClick={(e) => {
                                        props.onSelect(doc, index)
                                        setSelectedDoc(index);
                                    }}
                                >
                                    <ListItemButton disableGutters selected={selectedDoc === index}>
                                        <Grid container >
                                            <Grid item xs={2}>
                                                {doc.arxiv_id}
                                            </Grid>
                                            <Grid item xs={5} style={{ overflowX: "scroll" }}>
                                                {doc.stem}
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
    );
}


export const DocumentSelectorModal = (props: MenuItemProps) => {
    const state = React.useContext(GlobalState);

    const navigate = useNavigate();
    const [query, setQuery] = React.useState("");
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [documents, setDocuments] = React.useState([]);
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
    const selectDocument = (doc: Document, index: number) => {
        // On bugged selection, just quit
        if (doc.name == null) {
            console.error("Tried to select an empty doc: ", doc);
            return;
        }

        if (doc.name != state.fileid) {
            console.log('Swapping files; clearing annotations...');
            state.setAnnotations([]);
            state.setSavename("");
            state.setTimestamp("");
        }
        loadDocument(state, doc.name);
        queryParameters.set("fileid", doc.name);
        queryParameters.set("savename", "");
        queryParameters.set("timestamp", "");
        setQueryParameters(queryParameters)
    };

    const handleClose = (e: any) => {
        props.setIsOpen(false);
        navigate({ pathname: '/', search: queryParameters.toString() });
        e.stopPropagation();
    };
    const handleSaveSelectorClick = (e: any) => {
        const isOpen = saveSelectorOpen;
        setSaveSelectorOpen(!isOpen);
    };

    const onSelectSave = (save: any, index: number) => {
        loadAnnotations(state, save["fileid"], save["userid"], save["timestamp"], save["savename"]);
        queryParameters.set("fileid", save.fileid);
        queryParameters.set("timestamp", save.timestamp);
        queryParameters.set("savename", save.savename);
        setQueryParameters(queryParameters)
    };

    // Load documents immediately
    React.useEffect(() => { listAllDocuments(); }, []);

    const doSearch = (docs: any[]) => {
        return query.length == 0
            ? docs
            : fuzzysort.go(query, docs, { keys: ["stem", "arxiv_id"] }).map((t) => t.obj);
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
                    {saveSelectorOpen ? <ExpandLess /> : <ExpandMore />}
                    {saveSelectorOpen ? "Show files" : "Show saves"}
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
                <Collapse collapsedSize={200} in={!saveSelectorOpen} timeout="auto" >
                    <DocumentSelector
                        documents={documents}
                        onSelect={(doc: Document, index) => { selectDocument(doc, index); setSaveSelectorOpen(true) }}
                        filterFn={doSearch}
                    />
                </Collapse>
                <Collapse id={"save-selector-collapse"} in={saveSelectorOpen} timeout="auto" >
                    <SaveSelector
                        onSelectSave={onSelectSave}
                        allowExport={true}
                        allowMarkFinal={true}
                        allowDelete={true}
                    />
                </Collapse>
            </DialogContent>
        </Dialog >
    );
}
