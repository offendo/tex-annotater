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

export type ScoresDialogProps = {
    open: boolean
    setOpen: (x: boolean) => any
};

export function ScoresDialog(props: ScoresDialogProps) {

    const state = React.useContext(GlobalState);

    const [refSave, setRefSave] = React.useState(null);
    const [tags, setTags] = React.useState<string[]>(["definition", "theorem", "proof", "example", "reference", "name"])

    const handleClose = () => {
        props.setOpen(false);
    };
    const handleToggle = (s) => {
        const splitIndex = tags.findIndex((t) => s == t);
        if (splitIndex == -1) {
            setTags([...tags, s])
        } else {
            setTags([...tags.slice(0, splitIndex), ...tags.slice(splitIndex + 1)])
        }
    }

    const getScores = (state: GlobalStateProps, ref_fileid: string, ref_userid: string, ref_timestamp: string, tags: string[]) => {
        const tag_str = tags.join(";")
        const url = `/api/score?fileid=${state.fileid}&userid=${state.userid}&timestamp=${state.timestamp}&ref_fileid=${ref_fileid}&ref_userid=${ref_userid}&ref_timestamp=${ref_timestamp}&tags=${tag_str}`
        fetch(url).then((res) => {
            return res.blob()
        }).then((blob) => {
            console.log(blob);
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
                open={props.open}
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
                    <FormGroup>
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("definition") }} />} label="definition" />
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("theorem") }} />} label="theorem" />
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("proof") }} />} label="proof" />
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("name") }} />} label="name" />
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("reference") }} />} label="reference" />
                        <FormControlLabel control={<Checkbox defaultChecked onChange={(e) => { handleToggle("example") }} />} label="example" />
                    </FormGroup>
                </DialogContent>
                <DialogActions>
                    <Button type="submit" onClick={
                        (e) => {
                            getScores(state, refSave.fileid, refSave.userid, refSave.timestamp, tags); handleClose();
                        }}
                        disabled={refSave == null}>
                        Download Scores
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
