import * as React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Checkbox, Divider, IconButton, Input, SnackbarContent, Tooltip, useTheme } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import SaveIcon from "@mui/icons-material/Save";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MenuItem from "@mui/material/MenuItem";
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from "@mui/material/Menu";
import { TextSpan } from "@/lib/span";
import { ColorMap, defaultColorMap } from "@/lib/colors";
import { jumpToElement, shortenText } from "@/lib/utils";
import { Grid } from "@mui/material";
import { Status, GlobalState, loadAnnotations, loadDocument, saveAnnotations } from "@/lib/GlobalState";
import RemoveIcon from '@mui/icons-material/Remove';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import BackspaceIcon from '@mui/icons-material/Backspace';
import AddIcon from '@mui/icons-material/Add';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import usePatterns from "@/lib/Patterns";
import MenuIcon from '@mui/icons-material/Menu';
import { AnnotationMenu } from "./AnnotationMenu";
import { SaveFileSelector } from "./SaveFileSelector";
import { DocumentSelectorMenuItem } from "./DocumentSelectorMenuItem";
import { RegexPatternMenuItem } from "./RegexPatternMenuItem";


export default function TopBar() {
    const theme = useTheme();
    const state = React.useContext(GlobalState);

    const handleLoadMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => { setLoadMenuAnchorEl(event.currentTarget); };
    const handleLoadMenuClose = () => { setLoadMenuAnchorEl(null); };
    const [loadMenuAnchorEl, setLoadMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const loadMenuOpen = Boolean(loadMenuAnchorEl);

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
        loadAnnotations(state, "", "", "", true);
    }

    React.useEffect(() => {
        const saveid = queryParameters.get('saveid') || "";
        loadAnnotations(state, state.fileid, state.userid, saveid);
        setQueryParameters({ ...queryParameters, fileid: state.fileid, saveid: saveid, anchor: state.anchor })
    }, [state.fileid]);

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
                            open={loadMenuOpen}
                            onClose={handleLoadMenuClose}
                            slotProps={{
                                paper: {
                                    style: {
                                        width: 300,
                                    }
                                }
                            }}
                        >
                            <MenuItem
                                onClick={async (e) => {
                                    const annos = await saveAnnotations(state, state.annotations, false);
                                    setDidSave(annos != null);
                                    setMessage(
                                        annos
                                            ? "Successfully saved"
                                            : "Error: please see console",
                                    );
                                    handleLoadMenuClose();
                                }}
                            >
                                {/*<SaveFileSelector />*/}
                                <ListItemIcon>
                                    <SaveIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Save annotations
                                </ListItemText>
                                <Typography variant="body2" color="text.secondary">
                                    ⌘S
                                </Typography>
                            </MenuItem>

                            <MenuItem onClick={() => {
                                clearAnnotations();
                                handleLoadMenuClose();
                            }}>
                                <ListItemIcon>
                                    <BackspaceIcon />
                                </ListItemIcon>
                                <ListItemText>
                                    Clear Annotations
                                </ListItemText>
                            </MenuItem>
                            <DocumentSelectorMenuItem />
                            <RegexPatternMenuItem />
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
