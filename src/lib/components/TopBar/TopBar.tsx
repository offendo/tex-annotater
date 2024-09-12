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
import { Status, GlobalState, loadAnnotations, loadDocument, saveAnnotations, undoUpdate, redoUpdate, GlobalStateProps } from "@/lib/GlobalState";
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BackspaceIcon from '@mui/icons-material/Backspace';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import GradingIcon from '@mui/icons-material/Grading';
import MenuIcon from '@mui/icons-material/Menu';
import RedoIcon from '@mui/icons-material/Redo';
import UndoIcon from '@mui/icons-material/Undo';
import CompareIcon from '@mui/icons-material/Compare';
import AddIcon from '@mui/icons-material/Add';
import AccountBoxIcon from '@mui/icons-material/AccountBox';
import LogoutIcon from '@mui/icons-material/Logout';
import { AnnotationMenu } from "./AnnotationMenu";
import { DocumentSelectorModal } from "./DocumentSelectorModal";
import { RegexPatternModal } from "./RegexPatternModal";
import { SaveAsForm } from "./SaveAsForm";
import { NewAnnotationForm } from "./NewAnnotationForm";
import { ScoresModal } from "./ScoresModal";
import { CompareModal } from "./CompareModal";
import { parseSelection } from "@/lib/utils";
import useAuth from "@/lib/Token";


type TopBarProps = {
    disableKeybinds?: boolean;
}

export default function TopBar(props: TopBarProps) {
    const theme = useTheme();
    const state = React.useContext(GlobalState);
    const { userid, token, setAuth, unsetAuth } = useAuth();
    const navigate = useNavigate();

    const [selection, setSelection] = React.useState({start: 0, end: 0})

    /* NewAnnotationMenu */
    const [newAnnotationFormOpen, setNewAnnotationFormOpen] = React.useState<boolean>(false);
    const handleNewAnnotationFormClick = (event: any) => { setNewAnnotationFormOpen(true); };

    /* SaveAsForm */
    const [saveAsFormOpen, setSaveAsFormOpen] = React.useState<boolean>(false);
    const handleSaveAsFormClick = (event: any) => { setSaveAsFormOpen(true); };

    /* DocumentSelectorMenu */
    const [documentSelectorMenuOpen, setDocumentSelectorMenuOpen] = React.useState<boolean>(false);
    const handleDocumentSelectorMenuClick = (event: any) => { setDocumentSelectorMenuOpen(true); };

    /* RegexPatternMenu */
    const [regexPatternMenuOpen, setRegexPatternMenuOpen] = React.useState<boolean>(false);
    const handleRegexPatternMenuClick = (event: any) => { setRegexPatternMenuOpen(true); };

    /* ScoresDialog */
    const [scoresModalOpen, setScoresModalOpen] = React.useState<boolean>(false);
    const handleScoresModalClick = (event: any) => { setScoresModalOpen(true); };

    /* CompareModal */
    const [compareModalOpen, setCompareModalOpen] = React.useState<boolean>(false);
    const handleCompareModalClick = (event: any) => { setCompareModalOpen(true); };

    /* LoadFileMenu */
    const handleLoadMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { event.preventDefault(); setLoadMenuAnchorEl(event.currentTarget); };
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
        loadAnnotations(state, state.fileid, state.userid, "", "", true);
    }

    React.useEffect(() => {
        if (state.fileid) {
            queryParameters.set("fileid", state.fileid);
        }
        if (state.anchor) {
            queryParameters.set("anchor", state.anchor);
        }
        setQueryParameters(queryParameters)
    }, [state.fileid]);

    const doSave = async (name?: string) => {
        const didSave = await saveAnnotations(state, state.annotations, false, name != undefined ? name : state.savename);
        queryParameters.set("fileid", didSave.fileid);
        queryParameters.set("timestamp", didSave.timestamp);
        queryParameters.set("savename", name != undefined ? name : didSave.savename);
        if (state.anchor) {
            queryParameters.set("anchor", state.anchor);
        }
        setQueryParameters(queryParameters)
        setDidSave(didSave);
        setMessage(
            didSave
                ? "Successfully saved"
                : "Error: please see console",
        );
        return didSave;
    }

    // handle what happens on key press
    const handleKeyPress = React.useCallback(async (event: any) => {
        if (props.disableKeybinds) {
            return;
        }
        /* Menu items
           ========= */
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key == 's') {
            if (state.annotations.length == 0) {
                console.log("Can't save empty annotations!");
                setMessage("Can't save empty annotations!");
                return;
            }
            // save annotations with name on ctrl+shift+s
            handleSaveAsFormClick(event);
            event.preventDefault();
        } else if ((event.ctrlKey || event.metaKey) && event.key == 's') {
            if (state.annotations.length == 0) {
                console.log("Can't save empty annotations!");
                setMessage("Can't save empty annotations!");
                return;
            }
            // if we're not supplied a name or save name,
            if (!state.savename) {
                handleSaveAsFormClick(event);
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
        } else if ((event.ctrlKey || event.metaKey) && event.key == 'n') {
            // open new annotation menu on ctrl-n
            handleNewAnnotationFormClick(event)
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
                            onMouseDown={(e) => {
	                        e.preventDefault(); 
				e.stopPropagation();
				const selection = window.getSelection();
				const [start, end] = parseSelection(selection);
				setSelection({start: start, end: end});
			    }}
                            onMouseUp={(e) => {e.preventDefault(); e.stopPropagation()}}
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
                                onClick={(e) => {
                                    handleNewAnnotationFormClick(e);
                                    handleLoadMenuClose()
                                }}
                                disabled={selection[1] == 0}
                            >
                                <ListItemIcon>
                                    <AddIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    New Annotation Set
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⌘N
                                </Typography>
                                <NewAnnotationForm isOpen={newAnnotationFormOpen} setIsOpen={setNewAnnotationFormOpen} doSave={doSave} range={[selection.start, selection.end]} />
                            </MenuItem>
                            <MenuItem
                                onClick={async (e) => {
                                    handleSaveAsFormClick(e);
                                    handleLoadMenuClose();
                                }}
                                disabled={state.annotations.length == 0}
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
                                <SaveAsForm isOpen={saveAsFormOpen} setIsOpen={setSaveAsFormOpen} doSave={doSave} />
                            </MenuItem>
                            <MenuItem
                                onClick={async (e) => {
                                    if (!state.savename) {
                                        handleSaveAsFormClick(e);
                                    } else {
                                        doSave();
                                    }
                                    handleLoadMenuClose();
                                }}
                                disabled={state.annotations.length == 0}
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
                            <MenuItem onClick={(e) => { handleScoresModalClick(e) }} disabled={state.annotations.length == 0}>
                                <ListItemIcon>
                                    <GradingIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Get Annotation Scores
                                </ListItemText>
                                <ScoresModal isOpen={scoresModalOpen} setIsOpen={setScoresModalOpen} />
                            </MenuItem>
                            <MenuItem onClick={(e) => { handleCompareModalClick(e) }} disabled={state.fileid == ""} >
                                <ListItemIcon>
                                    <CompareIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Compare Annotations
                                </ListItemText>
                                <CompareModal isOpen={compareModalOpen} setIsOpen={setCompareModalOpen} />
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
                            <MenuItem component={"a"} href={"/dashboard"}>
                                <ListItemIcon>
                                    <AccountBoxIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Dashboard
                                </ListItemText>
                            </MenuItem>
                            <MenuItem onClick={(e) => { unsetAuth(); navigate('/signin') }}>
                                <ListItemIcon>
                                    <LogoutIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Logout
                                </ListItemText>
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
