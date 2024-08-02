import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { MenuItemProps } from './MenuItemProps';

export type SaveAsFormProps = {
    doSave: (name?: string) => any
};

export function SaveAsForm(props: SaveAsFormProps & MenuItemProps) {

    const handleClose = () => {
        props.setIsOpen(false);
    };

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
                        props.doSave(savename)
                        handleClose();
                    },
                }}
            >
                <DialogTitle>Save as</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter name to save annotations under:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="name"
                        name="savename"
                        label="Save annotations as"
                        type="text"
                        fullWidth
                        variant="standard"
                    />
                </DialogContent>
                <DialogActions>
                    <Button type="submit" >Save</Button>
                </DialogActions>
            </Dialog>
        </React.Fragment>
    );
}
