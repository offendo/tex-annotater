import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { saveAnnotations, GlobalState, GlobalStateProps } from '@/lib/GlobalState';
import { SaveSelector } from './SaveSelector';
import { MenuItemProps } from './MenuItemProps';
import { Grid } from '@mui/material';

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

export function ScoresDialog(props: MenuItemProps) {

    const state = React.useContext(GlobalState);

    const [refSave, setRefSave] = React.useState(null);
    const [tags, setTags] = React.useState<string[]>(allTags)

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

    const getScores = (state: GlobalStateProps, ref_fileid: string, ref_userid: string, ref_timestamp: string, tags: string[]) => {
        const tag_str = tags.join(";")
        const url = `/api/score?fileid=${state.fileid}&userid=${state.userid}&timestamp=${state.timestamp}&ref_fileid=${ref_fileid}&ref_userid=${ref_userid}&ref_timestamp=${ref_timestamp}&tags=${tag_str}`
        fetch(url).then((res) => {
            return res.blob()
        }).then((blob) => {
            var a = document.createElement("a");
            var file = new Blob([blob], { type: 'application/text' });
            a.href = URL.createObjectURL(file);
            a.download = "score.txt";
            a.click();
        });
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
                        Select a save file to use as a reference.
                    </DialogContentText>
                    <SaveSelector onSelectSave={(save, index) => setRefSave(save)} disableExport={true} disableMarkFinal={true} allowOtherUsers={true} />
                    <DialogContentText>
                        Select tags to score against
                    </DialogContentText>
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
                    <Button type="submit" onClick={
                        (e) => {
                            getScores(state, refSave.fileid, refSave.userid, refSave.timestamp, tags); handleClose(e);
                        }}
                        disabled={refSave == null}>
                        Download Scores
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
