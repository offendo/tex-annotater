import * as React from "react";
import { useSearchParams } from "react-router-dom";
import TextField from "@mui/material/TextField";
import { GlobalState, loadAnnotations, loadDocument } from "@/lib/GlobalState";
import { Typography, Button, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Grid, ListSubheader, Collapse } from "@mui/material";
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
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

type SaveSelectorProps = {
    onSelectSave: (save: any, index: number) => any;
    allowOtherUsers?: boolean;
    disableExport?: boolean;
    disableMarkFinal?: boolean;
}
// TODO Add MenuItem in the tokenizers which lets us type in our own name to send off

export const SaveSelector = (props: SaveSelectorProps) => {

    const theme = useTheme();
    const state = React.useContext(GlobalState);
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [selectedSaveGroup, setSelectedSaveGroup] = React.useState(-1);
    const [saves, setSaves] = React.useState<any[]>([]);
    const [selectedSave, setSelectedSave] = React.useState<number>(-1);
    const tokenizers = [
        { name: "Llemma 7b", id: "EleutherAI/llemma_7b" },
        { name: "Llemma 34b", id: "EleutherAI/llemma_34b" },
        { name: "GPT-3.5", id: "Xenova/gpt-3.5" },
        { name: "GPT-4", id: "Xenova/gpt-4" },
        { name: "BERT Base (cased)", id: "bert-base-cased" },
        { name: "BERT Large (cased)", id: "bert-large-cased" },
    ]

    const loadSaves = async (fileid: string, userid: string) => {
        try {
            let res = null;
            if (!(props.allowOtherUsers || state.isAdmin)) {
                res = await fetch(`/api/saves?fileid=${fileid}&userid=${userid}`, { mode: "cors" });
            } else {
                res = await fetch(`/api/saves?fileid=${fileid}`, { mode: "cors" });
            }
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

    const handleSaveGroupClick = (index: number) => {
        if (selectedSaveGroup != index) {
            setSelectedSaveGroup(index);
        } else {
            setSelectedSaveGroup(-1);
        }
    }


    const onSelectSave = (save: any, index: number) => {
        setSelectedSave(index);
        props.onSelectSave(save, index);
    };

    // Load saves whenever the fileid changes
    React.useEffect(() => {
        loadSaves(state.fileid, state.userid);
    },
        [state.fileid, state.annotations, state.savename]
    )

    const [tokenizerMenuAnchorEl, setTokenizerMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [tokenizerMenuOpen, setTokenizerMenuOpen] = React.useState<number>(-1);

    const handleTokenizerMenuClick = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        setTokenizerMenuAnchorEl(event.currentTarget);
        setTokenizerMenuOpen(tokenizerMenuOpen == index ? -1 : index)
    };
    const handleTokenizerMenuClose = () => {
        setTokenizerMenuAnchorEl(null);
        setTokenizerMenuOpen(-1);
    };

    const toggleIsFinal = async (timestamp, savename, userid, fileid) => {
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json", mode: "cors" },
        };
        const response = await fetch(`/api/finalize?timestamp=${timestamp}&savename=${savename}&userid=${userid}&fileid=${fileid}`, requestOptions);
        const json = await response.json();
        loadSaves(state.fileid, state.userid);
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
                            onSelectSave(save, index);
                        }}
                        disableGutters
                        disablePadding
                    >
                        <ListItemButton selected={selectedSave === index && selectedSaveGroup === saveGroupIndex}>
                            <Grid container >
                                <Grid item xs={1}>
                                    {
                                        !props.disableExport &&
                                        <>
                                            <IconButton
                                                id={save.timestamp + `groupIndex:${saveGroupIndex}:${index}`}
                                                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                                onClick={(e) => {
                                                    handleTokenizerMenuClick(e, index);
                                                    e.stopPropagation();
                                                }}
                                                style={{ padding: "0px" }}
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                            <Menu
                                                anchorEl={tokenizerMenuAnchorEl}
                                                open={tokenizerMenuOpen == index && selectedSaveGroup == saveGroupIndex}
                                                onClose={handleTokenizerMenuClose}
                                            >
                                                {
                                                    tokenizers.map(({ name, id }) => {
                                                        return (
                                                            <MenuItem
                                                                key={`name:${name}id:${id}:${save.timestamp}:${save.userid}:${save.fileid}`}
                                                                component="a"
                                                                href={`/api/export?fileid=${state.fileid}&userid=${save.userid}&timestamp=${save.timestamp}&savename=${save.savename}&tokenizer=${id}`}
                                                                onClick={handleTokenizerMenuClose}
                                                            >
                                                                {name}
                                                            </MenuItem>
                                                        );
                                                    })
                                                }
                                            </Menu>
                                        </>
                                    }
                                </Grid>
                                <Grid item xs={1}>
                                    {
                                        !props.disableMarkFinal &&
                                        <IconButton
                                            onMouseDown={(e) => { e.stopPropagation() }}
                                            onClick={(e) => { e.stopPropagation(); toggleIsFinal(save.timestamp, save.savename, save.userid, save.fileid) }}
                                            style={{ padding: "0px" }}
                                        >
                                            {save.final ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
                                        </IconButton>
                                    }
                                </Grid>
                                <Grid item xs={3}>
                                    {save.autosave ? "autosave" : `version ${total - save.saveIndex}`}
                                </Grid>
                                <Grid item xs={2}>
                                </Grid>
                                <Grid item xs={2}>
                                    {save.userid}
                                </Grid>
                                <Grid item xs={2}>
                                    {save.timestamp.split('.', 1)[0]}
                                </Grid>
                                <Grid item xs={1}>
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
        <Box
            sx={{
                width: 1200,
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
                                {props.disableExport ? "" : "Export"}
                            </Grid>
                            <Grid item xs={1}>
                                {props.disableMarkFinal ? "" : "Mark Final"}
                            </Grid>
                            <Grid item xs={3}>
                                Save Name
                            </Grid>
                            <Grid item xs={2}>
                                Initial User ID
                            </Grid>
                            <Grid item xs={2}>
                                Last User ID
                            </Grid>
                            <Grid item xs={2}>
                                Last Timestamp
                            </Grid>
                            <Grid item xs={1}>
                                # Anno.
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
                                                <Tooltip title={savelist[0].savename}>
                                                    {savelist[0].savename.length > 20 ? savelist[0].savename.slice(0,20) + '...' : savelist[0].savename}
                                                </Tooltip>
                                            </Grid>
                                            <Grid item xs={2}>
                                                {savelist.at(-1).userid}
                                            </Grid>
                                            <Grid item xs={2}>
                                                {savelist[0].userid}
                                            </Grid>
                                            <Grid item xs={2}>
                                                {savelist[0].timestamp.split('.', 1)[0]}
                                            </Grid>
                                            <Grid item xs={1}>
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
    );
}
