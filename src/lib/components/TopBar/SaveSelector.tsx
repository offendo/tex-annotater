import * as React from "react";
import { useSearchParams } from "react-router-dom";
import TextField from "@mui/material/TextField";
import { GlobalState, loadAnnotations, loadDocument, deleteSave } from "@/lib/GlobalState";
import { Typography, Button, IconButton, Box, Dialog, DialogTitle, DialogContent, DialogActions, useTheme, Grid, ListSubheader, Collapse, InputAdornment } from "@mui/material";
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import MenuIcon from '@mui/icons-material/Menu';
import ListItemText from '@mui/material/ListItemText';
import fuzzysort from "fuzzysort";
import FileOpenIcon from '@mui/icons-material/FileOpen';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import CloseIcon from '@mui/icons-material/Close';
import { orderBy, groupBy, sortBy, maxBy, minBy } from "lodash";
import { MenuItemProps } from "./MenuItemProps";
import { contains, toggle } from "@/lib/utils";
import { ConfirmationModal } from "./ConfirmationModal";

type SaveSelectorProps = {
    onSelectSave: (save: any, index: number) => any;
    allowMultipleSelections?: boolean;
    allowOtherUsers?: boolean;
    allowExport?: boolean;
    allowMarkFinal?: boolean;
    allowDelete?: boolean;
}

const tokenizers = [
    { name: "Llemma 7b", id: "EleutherAI/llemma_7b" },
    { name: "Llemma 34b", id: "EleutherAI/llemma_34b" },
    { name: "GPT-3.5", id: "Xenova/gpt-3.5" },
    { name: "GPT-4", id: "Xenova/gpt-4" },
    { name: "BERT Base (cased)", id: "bert-base-cased" },
    { name: "BERT Large (cased)", id: "bert-large-cased" },
]

type ExportMenuProps = {
    save: any;
    anchor: any | null;
}

const ExportMenu = (props: ExportMenuProps & MenuItemProps) => {
    const state = React.useContext(GlobalState);
    const [tokenizer, setTokenizer] = React.useState<string>("");

    const handleTokenizerMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        props.setIsOpen(!props.isOpen);
    };
    const handleTokenizerMenuClose = () => {
        props.setIsOpen(false);
    };

    const save = props.save;

    return (
        <Menu
            anchorEl={props.anchor}
            open={props.isOpen}
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
            <MenuItem
                key={"custom-tokenizer-name"}
            >
                <span>
                    <TextField
                        id="custom-tokenizer-text-field"
                        label="Custom tokenizer"
                        variant={"outlined"}
                        onMouseDown={(e) => { e.stopPropagation() }}
                        onClick={(e) => { e.stopPropagation() }}
                        onKeyDown={(e) => {
                            if (e.key != "Escape") { e.stopPropagation() };
                        }}
                        onChange={(e) => { setTokenizer(e.target.value) }}
                        InputProps={{
                            endAdornment:
                                <InputAdornment position="end">
                                    <IconButton
                                        onMouseDown={(e) => { e.stopPropagation() }}
                                        href={`/api/export?fileid=${state.fileid}&userid=${save.userid}&timestamp=${save.timestamp}&savename=${save.savename}&tokenizer=${tokenizer}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleTokenizerMenuClose();
                                        }}
                                    >
                                        <DownloadIcon />
                                    </IconButton>
                                </InputAdornment>,
                        }}
                    />

                </span>
            </MenuItem>
        </Menu>
    );
}

type SaveOptionsMenuProps = {
    save: any;
    loadSaves: (fileid: string, userid: string) => void;

}

const SaveOptionsMenu = (props: SaveOptionsMenuProps) => {

    const state = React.useContext(GlobalState);

    // This (SaveOptions) menu
    const [saveOptionsMenuAnchorEl, setSaveOptionsMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [saveOptionsMenuOpen, setSaveOptionsMenuOpen] = React.useState<boolean>(false);

    const handleSaveOptionsMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSaveOptionsMenuAnchorEl(event.currentTarget);
        setSaveOptionsMenuOpen(!saveOptionsMenuOpen)
    };
    const handleSaveOptionsMenuClose = () => {
        setSaveOptionsMenuAnchorEl(null);
        setSaveOptionsMenuOpen(false);
    };

    // Export Menu
    const [exportMenuAnchorEl, setExportMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [exportMenuOpen, setExportMenuOpen] = React.useState<boolean>(false);
    const handleExportMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setExportMenuAnchorEl(event.currentTarget);
        setExportMenuOpen(!exportMenuOpen)
    };
    const handleExportMenuClose = () => {
        setExportMenuAnchorEl(null);
        setExportMenuOpen(false);
    };

    // Delete modal
    const [deleteModalOpen, setDeleteModalOpen] = React.useState<boolean>(false);
    const handleDeleteModalClick = (event: React.MouseEvent<HTMLButtonElement>) => { setDeleteModalOpen(!deleteModalOpen) };
    const handleDeleteModalClose = () => { setDeleteModalOpen(false); };


    // Mark Final function
    const toggleIsFinal = async (timestamp: string, savename: string, userid: string, fileid: string) => {
        const requestOptions = {
            method: "POST",
            headers: { "Content-Type": "application/json", mode: "cors" },
        };
        const response = await fetch(`/api/finalize?timestamp=${timestamp}&savename=${savename}&userid=${userid}&fileid=${fileid}`, requestOptions);
        const json = await response.json();
        props.loadSaves(state.fileid, state.userid);
        return;
    }


    return (
        <React.Fragment>
            <IconButton
                onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                onClick={(e) => {
                    handleSaveOptionsMenuClick(e);
                    e.stopPropagation();
                }}
                style={{ padding: "0px" }}
            >
                <MenuIcon />
            </IconButton>
            <Menu
                anchorEl={saveOptionsMenuAnchorEl}
                open={saveOptionsMenuOpen}
                onClose={handleSaveOptionsMenuClose}
            >
                <MenuItem
                    key={"mark-final-menu"}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => {
                        toggleIsFinal(props.save.timestamp, props.save.savename, props.save.userid, props.save.fileid)
                        e.stopPropagation();
                    }}
                    disabled={!props.allowMarkFinal}
                >

                    <ListItemIcon style={{ marginRight: 10 }}> {props.save.final ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />} </ListItemIcon>
                    Mark Final
                </MenuItem>

                <MenuItem
                    key={"export-menu"}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => {
                        handleExportMenuClick(e);
                        e.stopPropagation();
                    }}
                    disabled={!props.allowExport}
                >
                    <ListItemIcon style={{ marginRight: 10 }}> <DownloadIcon /> </ListItemIcon>
                    Export
                    <ExportMenu isOpen={exportMenuOpen} setIsOpen={setExportMenuOpen} save={props.save} anchor={exportMenuAnchorEl} />
                </MenuItem>
                <MenuItem
                    key={"delete-save"}
                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onClick={(e) => {
                        handleDeleteModalClick(e);
                        e.stopPropagation();
                    }}
                    disabled={!props.allowDelete}
                >
                    <ListItemIcon style={{ marginRight: 10 }}> <DeleteIcon /> </ListItemIcon>
                    Delete
                    <ConfirmationModal
                        isOpen={deleteModalOpen}
                        setIsOpen={setDeleteModalOpen}
                        message={`Are you sure you want to delete "${props.save.savename} : ${props.save.timestamp}"`}
                        onConfirm={(e) => {
                            deleteSave(state, props.save.fileid, props.save.savename, props.save.timestamp, props.save.userid).then(() => {
                                props.loadSaves(props.save.fileid, props.save.userid)
                            }
                            );
                            handleSaveOptionsMenuClose();
                        }}
                        onCancel={(e) => { console.log('cancel'); handleSaveOptionsMenuClose(); }}
                    />
                </MenuItem>
            </Menu>
        </React.Fragment>
    );
}


export const SaveSelector = (props: SaveSelectorProps) => {

    const theme = useTheme();
    const state = React.useContext(GlobalState);

    const [saveOptionsMenuOpen, setSaveOptionsMenuOpen] = React.useState<boolean>(false);

    const handleSaveOptionsMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setSaveOptionsMenuAnchorEl(event.currentTarget);
        setSaveOptionsMenuOpen(!saveOptionsMenuOpen)
    };
    const handleSaveOptionsMenuClose = () => {
        setSaveOptionsMenuAnchorEl(null);
        setSaveOptionsMenuOpen(false);
    };
    const [selectedSaveGroup, setSelectedSaveGroup] = React.useState<string[]>([]);
    const [saves, setSaves] = React.useState<any[]>([]);
    const [selectedSave, setSelectedSave] = React.useState<number[]>([-1]);
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

    const handleSaveGroupClick = (savename: string) => {
        if (props.allowMultipleSelections) {
            setSelectedSaveGroup(toggle(selectedSaveGroup, savename));
        } else if (contains(selectedSaveGroup, savename)) {
            setSelectedSaveGroup([]);
        } else {
            setSelectedSaveGroup([savename]);
        }
    }


    const onSelectSave = (save: any, index: number) => {
        if (props.allowMultipleSelections) {
            setSelectedSave(toggle(selectedSave, save.timestamp));
        } else {
            setSelectedSave([save.timestamp]);
        }
        props.onSelectSave(save, index);
    };

    // Load saves whenever the fileid changes
    React.useEffect(() => {
        loadSaves(state.fileid, state.userid);
    },
        [state.fileid, state.annotations, state.savename]
    )

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
                        style={{ backgroundColor: save.final ? "rgb(from var(--solarized-green) r g b / 30%)" : "var(--solarized-base3)" }}
                        value={save.timestamp}
                        onClick={(e) => {
                            onSelectSave(save, index);
                        }}
                        disableGutters
                        disablePadding
                    >
                        <ListItemButton selected={contains(selectedSave, save.timestamp) && contains(selectedSaveGroup, save.savename)}>
                            <Grid container >
                                <Grid item xs={1}>
                                    {<SaveOptionsMenu save={save} isOpen={saveOptionsMenuOpen} setIsOpen={setSaveOptionsMenuOpen} loadSaves={loadSaves} />}
                                </Grid>
                                <Grid item xs={4}>
                                    {save.autosave ? "autosave" : `version ${total - save.saveIndex}`}
                                </Grid>
                                <Grid item xs={3}>
                                    {save.userid}
                                </Grid>
                                <Grid item xs={3}>
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
                maxHeight: 600,
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
                            </Grid>
                            <Grid item xs={4}>
                                Save Name
                            </Grid>
                            <Grid item xs={3}>
                                Initial/Last User ID
                            </Grid>
                            <Grid item xs={3}>
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
                                    <ListItemButton selected={contains(selectedSaveGroup, savelist[0].savename)} onClick={(e) => handleSaveGroupClick(savelist[0].savename)}>
                                        <Grid container >
                                            <Grid item xs={1}>
                                                {contains(selectedSaveGroup, savelist[0].savename) ? <ExpandLess /> : <ExpandMore />}
                                            </Grid>
                                            <Grid item xs={4}>
                                                <Tooltip title={savelist[0].savename}>
                                                    <span>{savelist[0].savename.length > 20 ? savelist[0].savename.slice(0, 20) + '...' : savelist[0].savename}</span>
                                                </Tooltip>
                                            </Grid>
                                            <Grid item xs={3}>
                                                {savelist.at(-1).userid} / {savelist[0].userid}
                                            </Grid>
                                            <Grid item xs={3}>
                                                {savelist[0].timestamp.split('.', 1)[0]}
                                            </Grid>
                                            <Grid item xs={1}>
                                                {savelist[0].count}
                                            </Grid>
                                        </Grid>
                                    </ListItemButton>
                                    <Collapse in={contains(selectedSaveGroup, savelist[0].savename)} timeout="auto" unmountOnExit>
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
