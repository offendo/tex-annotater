import { GlobalState, GlobalStateProps, saveAnnotations } from '@/lib/GlobalState';
import { toggle } from '@/lib/utils';
import { Grid } from '@mui/material';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import InputLabel from '@mui/material/InputLabel';
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import OutlinedInput from '@mui/material/OutlinedInput';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import * as React from 'react';
import { redirect, useNavigate, useSearchParams, createSearchParams, Link } from "react-router-dom";
import { MenuItemProps } from './MenuItemProps';
import { SaveSelector } from './SaveSelector';

const allTags = ["definition", "theorem", "proof", "example", "reference", "name"];
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
    PaperProps: {
        style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
            minWidth: 250,
            maxWidth: 250,
        },
    },
};

export function CompareModal(props: MenuItemProps) {

    const state = React.useContext(GlobalState);
    const navigate = useNavigate()

    const [saves, setSaves] = React.useState<string[]>([]);
    const [tags, setTags] = React.useState<string[]>(allTags);

    const handleClose = (e) => {
        props.setIsOpen(false);
        e.stopPropagation();
    };
    const handleTagChange = (event: SelectChangeEvent<string[]>) => {
        const {
            target: { value },
        } = event;
        setTags(
            // On autofill we get a stringified value.
            typeof value === 'string' ? value.split(',') : value,
        );
    };


    const handleSaveToggle = (s: string) => {
        const t = toggle(saves, s)
        setSaves(t);
    }

    const openComparison = (fileid: string, timestamps: string[], tags: string[]) => {
        const params = createSearchParams({
            fileid: fileid,
            timestamps: timestamps,
            tags: tags,
        }).toString()
        navigate({ pathname: `/comparison`, search: params });
        navigate(0);
    }

    return (
        <React.Fragment>
            <Dialog
                open={props.isOpen}
                onClose={handleClose}
                maxWidth="xl"
            >
                <DialogTitle>Choose Reference</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Select saves to compare
                    </DialogContentText>
                    <SaveSelector onSelectSave={(save, index) => handleSaveToggle(save.timestamp)} disableExport={true} disableMarkFinal={true} allowMultipleSelections={true} allowOtherUsers={true} />
                </DialogContent>
                <DialogActions>
                    <div style={{ width: "100%" }}>
                        <FormControl sx={{ m: 1, width: 500 }}>
                            <InputLabel id="select-tags-menu-label">Select tags</InputLabel>
                            <Select
                                labelId="select-tags-menu-label"
                                id="select-tags-menu"
                                multiple
                                value={tags}
                                onChange={handleTagChange}
                                input={<OutlinedInput id="select-tags-label-input" label="Select tags" />}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip key={value} label={value} />
                                        ))}
                                    </Box>
                                )}
                                MenuProps={MenuProps}
                            >
                                {allTags.map((name) => (
                                    <MenuItem
                                        id={`select-tags-menu-item-${name}`}
                                        key={name}
                                        value={name}
                                    >
                                        {name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    <Button type="submit" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button type="submit" onClick={
                        (e) => {
                            openComparison(state.fileid, saves, tags); handleClose(e);
                        }}
                        disabled={saves.length == 0}>
                        Compare
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
