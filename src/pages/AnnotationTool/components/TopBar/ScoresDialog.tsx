import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { saveAnnotations, GlobalState, GlobalStateProps } from '@/lib/GlobalState';
import { SaveSelector } from './SaveSelector';

export type ScoresDialogProps = {
    open: boolean
    setOpen: (x: boolean) => any
};

export function ScoresDialog(props: ScoresDialogProps) {

    const state = React.useContext(GlobalState);

    const [refSave, setRefSave] = React.useState(null);

    const handleClose = () => {
        props.setOpen(false);
    };

    const getScores = (state: GlobalStateProps, ref_fileid: string, ref_userid: string, ref_timestamp: string) => {
        const url = `/api/score?fileid=${state.fileid}&userid=${state.userid}&timestamp=${state.timestamp}&ref_fileid=${ref_fileid}&ref_userid=${ref_userid}&ref_timestamp=${ref_timestamp}`
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
                    <SaveSelector onSelectSave={(save, index) => setRefSave(save)} disableExport={true} disableMarkFinal={true} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={(e) => { getScores(state, refSave.fileid, refSave.userid, refSave.timestamp); handleClose(); }} disabled={refSave == null}>Download Scores</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
