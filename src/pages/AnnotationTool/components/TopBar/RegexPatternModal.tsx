import * as React from "react";
import { Typography, Box, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, useTheme } from "@mui/material";
import TextField from "@mui/material/TextField";
import MenuItem from '@mui/material/MenuItem';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import usePatterns from "@/lib/Patterns";
import { MenuItemProps } from "./MenuItemProps";

export const RegexPatternModal = (props: MenuItemProps) => {
    const theme = useTheme();
    const { regexPatterns, setRegexPatterns } = usePatterns();
    const { patterns, selectedPatterns } = regexPatterns;

    const toggleRegexPattern = (value: string) => {
        const currentIndex = selectedPatterns.indexOf(value);
        const newSelections = [...selectedPatterns];
        if (currentIndex === -1) {
            newSelections.push(value);
        } else {
            newSelections.splice(currentIndex, 1);
        }

        setRegexPatterns({ patterns: patterns, selectedPatterns: newSelections });
    };
    const removeRegexPattern = (regex: string) => {
        const currentIndex = patterns.indexOf(regex);
        const newPatterns = [...patterns];
        if (currentIndex !== -1) {
            newPatterns.splice(currentIndex, 1);
            const selIndex = selectedPatterns.indexOf(regex);
            if (selIndex !== -1) {
                selectedPatterns.splice(selIndex, 1);
            }
        }
        setRegexPatterns({ patterns: newPatterns, selectedPatterns: selectedPatterns });
    }

    const addRegexPattern = (regex: string) => {
        const currentIndex = patterns.indexOf(regex);
        const newPatterns = [...patterns];
        if (currentIndex === -1) {
            newPatterns.push(regex);
            selectedPatterns.push(regex);
        }
        setRegexPatterns({ patterns: newPatterns, selectedPatterns: selectedPatterns });
    }
    return (
        <Dialog
            open={props.isOpen}
            onClose={() => props.setIsOpen(false)}
            keepMounted
        >
            <DialogTitle>Manage Autolink Regex</DialogTitle>
            <DialogActions >
                <IconButton
                    onClick={(e) => {
                        const el = document.getElementById("newpattern");
                        if (el != null && el.value.length > 0) {
                            addRegexPattern(el.value);
                        }
                    }}
                >
                    <AddIcon />
                </IconButton>
                <TextField
                    size="small"
                    fullWidth
                    margin="dense"
                    id={"newpattern"}
                    label={"Add new regex"}
                    variant="outlined"
                    style={{ paddingRight: 30 }}
                    onClick={(e) => { e.stopPropagation(); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onKeyDown={(e) => { e.stopPropagation(); }}
                />
            </DialogActions>
            <DialogContent>
                <Box sx={{ width: 500, height: 300, backgroundColor: theme.palette.background.default, m: "auto", overflow: "scroll" }}>
                    {
                        patterns.map((regex: string) => {
                            return (
                                <ListItem
                                    key={crypto.randomUUID()}
                                    secondaryAction={
                                        <IconButton edge="end" aria-label="remove" onClick={(e) => { removeRegexPattern(regex) }}>
                                            <RemoveIcon />
                                        </IconButton>
                                    }
                                    disablePadding
                                >
                                    <ListItemButton onClick={(e) => { toggleRegexPattern(regex) }} dense>
                                        <ListItemIcon>
                                            <Checkbox
                                                edge="start"
                                                checked={selectedPatterns.indexOf(regex) !== -1}
                                                tabIndex={-1}
                                                disableRipple
                                            />
                                        </ListItemIcon>
                                        <ListItemText id={regex} primary={regex} />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })
                    }
                </Box>
            </DialogContent>
        </Dialog>
    );
}
