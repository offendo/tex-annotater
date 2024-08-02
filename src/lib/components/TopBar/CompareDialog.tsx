import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import { saveAnnotations, GlobalState, GlobalStateProps } from '@/lib/GlobalState';
import { SaveSelector } from './SaveSelector';
import { MenuItemProps } from './MenuItemProps';
import { useNavigate, useSearchParams } from "react-router-dom";
import { Grid } from '@mui/material';
import { toggle } from '@/lib/utils';

export function CompareDialog(props: MenuItemProps) {

    const state = React.useContext(GlobalState);
    const navigate = useNavigate()

    const [saves, setSaves] = React.useState<string[]>([]);
    const [tags, setTags] = React.useState<string[]>(["definition", "theorem", "proof", "example", "reference", "name"])

    const handleClose = () => {
        props.setIsOpen(false);
    };
    const handleTagToggle = (s: string) => {
        setTags(toggle(tags, s))
    }
    const handleSaveToggle = (s: string) => {
        const t = toggle(saves, s)
        setSaves(t);
        console.log('saves: ', t);
    }

    const openComparison = (fileid: string, timestamps: string[], tags: string[]) => {
        navigate(`/comparison?fileid=${fileid}&timestampA=${timestamps[0]}&timestampB=${timestamps[1]}&tags=${tags.join(';')}`);
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
                    <FormGroup>
                        <Grid container style={{ width: "50%" }}>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("definition") }} />} label="definition" />
                            </Grid>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("theorem") }} />} label="theorem" />
                            </Grid>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("proof") }} />} label="proof" />
                            </Grid>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("name") }} />} label="name" />
                            </Grid>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("reference") }} />} label="reference" />
                            </Grid>
                            <Grid item xs={4}>
                                <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleTagToggle("example") }} />} label="example" />
                            </Grid>
                        </Grid>
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button type="submit" onClick={
                        (e) => {
                            openComparison(state.fileid, saves, tags); handleClose();
                        }}
                        disabled={saves.length == 0}>
                        Open comparisons
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
