import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { MenuItemProps } from './MenuItemProps';
import { GlobalState, loadAnnotations, updateAnnotations } from '@/lib/GlobalState';
import { ColorMap, colors } from "@/lib/colors"
import { TextSpan } from '@/lib/span';

export type NewAnnotationFormProps = {
    doSave: (name?: string) => any
    range: number[]
};

export function NewAnnotationForm(props: NewAnnotationFormProps & MenuItemProps) {
    const state = React.useContext(GlobalState);

    const handleClose = () => {
        props.setIsOpen(false);
    };
    const addStartAndEnd = (start: number, end: number) => {
        const beginAnno = {
            annoid: crypto.randomUUID(),
            start: start,
            end: start + 1,
            text: state.tex.slice(start, start + 1),
            tag: "begin annotation",
            fileid: state.fileid,
            links: [],
            color: Object.values(colors)[0],
        } as TextSpan;
        const endAnno = {
            annoid: crypto.randomUUID(),
            start: end - 1,
            end: end,
            text: state.tex.slice(end - 1, end),
            tag: "end annotation",
            fileid: state.fileid,
            links: [],
            color: Object.values(colors)[1],
        } as TextSpan;

        // Update the annotations
        state.annotations = [beginAnno, endAnno];
    }

    return (
        <React.Fragment>
            <Dialog
                open={props.isOpen}
                onClose={handleClose}
                PaperProps={{
                    component: 'form',
                    onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);
                        const formJson = Object.fromEntries((formData as any).entries());
                        const savename = formJson.savename;
                        addStartAndEnd(props.range[0], props.range[1]);
                        props.doSave(savename).then((res: any) => {
                            loadAnnotations(state, res.fileid, res.userid, res.timestamp, res.savename)
                        });
                        handleClose();
                    },
                }}
            >
                <DialogTitle>New Annotation Set</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter save name:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="name"
                        name="savename"
                        label="Save name"
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button type="submit" >Begin</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
