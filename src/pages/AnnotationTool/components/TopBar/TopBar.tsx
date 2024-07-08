import * as React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Checkbox, Divider, IconButton, Input, SnackbarContent, Tooltip, useTheme } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import SaveIcon from "@mui/icons-material/Save";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from "@mui/material/Menu";
import { Status, GlobalState, loadAnnotations, loadDocument, saveAnnotations, undoUpdate, redoUpdate } from "@/lib/GlobalState";
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BackspaceIcon from '@mui/icons-material/Backspace';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import MenuIcon from '@mui/icons-material/Menu';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import { AnnotationMenu } from "./AnnotationMenu";
import { DocumentSelectorModal } from "./DocumentSelectorModal";
import { RegexPatternModal } from "./RegexPatternModal";
import { SaveAsForm } from "./SaveAsForm";


export default function TopBar() {
    const theme = useTheme();
    const state = React.useContext(GlobalState);

    /* SaveAsMenu */
    const [saveAsMenuOpen, setSaveAsMenuOpen] = React.useState<boolean>(false);
    const handleSaveAsMenuClick = (event: any) => { setSaveAsMenuOpen(true); };
    // const handleDocumentSelectorMenuClose = () => { setDocumentSelectorMenuOpen(false); };

    /* DocumentSelectorMenu */
    const [documentSelectorMenuOpen, setDocumentSelectorMenuOpen] = React.useState<boolean>(false);
    const handleDocumentSelectorMenuClick = (event: any) => { setDocumentSelectorMenuOpen(true); };
    // const handleDocumentSelectorMenuClose = () => { setDocumentSelectorMenuOpen(false); };

    /* RegexPatternMenu */
    const [regexPatternMenuOpen, setRegexPatternMenuOpen] = React.useState<boolean>(false);
    const handleRegexPatternMenuClick = (event: any) => { setRegexPatternMenuOpen(true); };
    // const handleRegexPatternMenuClose = () => { setRegexPatternMenuOpen(false); };


    /* LoadFileMenu */
    const handleLoadMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { setLoadMenuAnchorEl(event.currentTarget); };
    const handleLoadMenuClose = () => { setLoadMenuAnchorEl(null); };
    const [loadMenuAnchorEl, setLoadMenuAnchorEl] = React.useState<null | HTMLElement>(null);

    const [queryParameters, setQueryParameters] = useSearchParams();
    const [didSave, setDidSave] = React.useState(false);
    const [message, setMessage] = React.useState("");

    // Functionality stuff
    const handleAlertClose = (e: any) => {
        setMessage("");
        setDidSave(false);
    }

    const handleStatusClose = (e: any) => {
        state.setStatus(Status.Ready);
    }

    const clearAnnotations = () => {
        loadAnnotations(state, "", "", "", "", true);
    }

    React.useEffect(() => {
        const timestamp = queryParameters.get('timestamp') || "";
        const savename = queryParameters.get('savename') || "";
        loadAnnotations(state, state.fileid, state.userid, timestamp, savename);
        setQueryParameters({ ...queryParameters, fileid: state.fileid, timestamp: state.timestamp, savename: state.savename, anchor: state.anchor })
    }, [state.fileid]);

    const doSave = async (name?: string) => {
        const didSave = await saveAnnotations(state, state.annotations, false, name != undefined ? name : state.savename);
        setDidSave(didSave);
        setMessage(
            didSave
                ? "Successfully saved"
                : "Error: please see console",
        );
    }


    // handle what happens on key press
    const handleKeyPress = React.useCallback(async (event: any) => {
        /* Menu items
           ========= */
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key == 's') {
            // save annotations with name on ctrl+shift+s
            handleSaveAsMenuClick(event);
            event.preventDefault();
        } else if ((event.ctrlKey || event.metaKey) && event.key == 's') {
            // save annotations on ctrl+s
            // if we're not supplied a name or save name,
            if (!state.savename) {
                handleSaveAsMenuClick(event);
            } else {
                doSave();
            }
            event.preventDefault();
        } else if ((event.ctrlKey || event.metaKey) && event.key == 'o') {
            // open document menu on ctrl-o
            handleDocumentSelectorMenuClick(event)
            event.preventDefault();
        } else if ((event.ctrlKey || event.metaKey) && event.key == 'm') {
            // open regex menu on ctrl-m
            handleRegexPatternMenuClick(event)
            event.preventDefault();
        }
    }, [state]);

    React.useEffect(() => {
        // attach the event listener
        document.addEventListener('keydown', handleKeyPress);

        // remove the event listener
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar
                color="primary"
                position="static"
            >
                <Toolbar>
                    <span>
                        <IconButton
                            size="large"
                            color="inherit"
                            sx={{ mr: 2 }}
                            onClick={handleLoadMenuClick}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Menu
                            anchorEl={loadMenuAnchorEl}
                            open={Boolean(loadMenuAnchorEl)}
                            onClose={handleLoadMenuClose}
                            keepMounted
                            slotProps={{
                                paper: {
                                    style: {
                                        width: 300,
                                    }
                                }
                            }}
                        >
                            <MenuItem onClick={() => { undoUpdate(state) }}>
                                <ListItemIcon>
                                    <UndoIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Undo
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⌘Z
                                </Typography>
                            </MenuItem>
                            <MenuItem onClick={() => { redoUpdate(state) }}>
                                <ListItemIcon>
                                    <RedoIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Redo
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⇧⌘ Z
                                </Typography>
                            </MenuItem>
                            <MenuItem
                                onClick={async (e) => {
                                    handleSaveAsMenuClick(e);
                                    handleLoadMenuClose();
                                }}
                            >
                                <ListItemIcon>
                                    <SaveIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Save Annotations As
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⇧⌘S
                                </Typography>
                                <SaveAsForm open={saveAsMenuOpen} setOpen={setSaveAsMenuOpen} doSave={doSave} />
                            </MenuItem>
                            <MenuItem
                                onClick={async (e) => {
                                    if (!state.savename) {
                                        handleSaveAsMenuClick(event);
                                    } else {
                                        doSave();
                                    }
                                    handleLoadMenuClose();
                                }}
                            >
                                <ListItemIcon>
                                    <SaveIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Save Annotations
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⌘S
                                </Typography>
                            </MenuItem>
                            <MenuItem onClick={() => { clearAnnotations(); handleLoadMenuClose(); }}>
                                <ListItemIcon>
                                    <BackspaceIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Clear Annotations
                                </ListItemText>
                            </MenuItem>
                            <MenuItem onClick={(e) => { handleDocumentSelectorMenuClick(e); handleLoadMenuClose() }} >
                                <ListItemIcon>
                                    <FileOpenIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Open Doc/Load Save
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary"> ⌘O </Typography>
                                <DocumentSelectorModal isOpen={documentSelectorMenuOpen} setIsOpen={setDocumentSelectorMenuOpen} />
                            </MenuItem>
                            <MenuItem onClick={handleRegexPatternMenuClick} >
                                <ListItemIcon>
                                    <ManageSearchIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Modify AutoLink Regex
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary"> ⌘M </Typography>
                                <RegexPatternModal isOpen={regexPatternMenuOpen} setIsOpen={setRegexPatternMenuOpen} />
                            </MenuItem>
                        </Menu>
                    </span>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            flexGrow: 0,
                            display: { xs: "none", sm: "block" },
                        }}
                        style={{ justifyContent: "center" }}
                    >
                        LaTeX Annotater
                    </Typography>

                    <AnnotationMenu />
                    <Divider orientation="vertical" sx={{ flexGrow: 1 }} />
                    <Typography variant="h6" > {state.fileid.replace('.tex', '')} </Typography>
                </Toolbar>
            </AppBar>
            <Snackbar
                open={message != ""}
                autoHideDuration={4000}
                onClose={handleAlertClose}
            >
                <Alert
                    onClose={handleAlertClose}
                    severity={didSave ? "success" : "error"}
                    variant="filled"
                    sx={{ width: "100%" }}
                >
                    {message}
                </Alert>
            </Snackbar>
        </Box >
    );
}
