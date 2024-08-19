import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { MenuItemProps } from './MenuItemProps';

export type ConfirmationModalProps = {
    onConfirm: () => any
    onCancel?: () => any
    message?: string;
}

export const ConfirmationModal = (props: ConfirmationModalProps & MenuItemProps) => {
    const handleClose = () => {
        props.setIsOpen(false);
    };

    return (
        <React.Fragment>
            <Dialog
                open={props.isOpen}
                onClose={handleClose}
            >
                <DialogTitle id="responsive-dialog-title">
                    {"Confirm"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {props.message || "Are you sure?"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={(e) => {
                        if (props.onCancel) {
                            props.onCancel();
                        }
                        handleClose();
                    }}>
                        Cancel
                    </Button>
                    <Button onClick={(e) => { props.onConfirm(); handleClose(); }}>
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </React.Fragment >
    );
}
