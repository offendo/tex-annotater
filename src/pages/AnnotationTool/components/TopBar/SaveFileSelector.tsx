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
import AddIcon from '@mui/icons-material/Add';
import usePatterns from "@/lib/Patterns";

type SaveFileProps = {};

export const SaveFileSelector = (props: SaveFileProps) => {
    const state = React.useContext(GlobalState);
    const [selected, setSelected] = React.useState("");
    const [saves, setSaves] = React.useState<any[]>([]);

    const [queryParameters, setQueryParameters] = useSearchParams();

    const handleChange = (event: SelectChangeEvent) => {
        if (event.target.value == "empty") {
            loadAnnotations(state, "", "", "", true);
            setSelected(event.target.value);
            return;
        }
        const s = JSON.parse(event.target.value);
        setSelected(event.target.value);
        loadAnnotations(state, s["fileid"], s["userid"], s["timestamp"]);
        setQueryParameters({ fileid: s['fileid'], saveid: s['timestamp'] })
    };

    const loadSaves = (fileid: string) => {
        fetch(`/api/saves?fileid=${fileid}`, { mode: "cors" })
            .then((res) => res.json())
            .then((res) => {
                setSaves(res["saves"]);
            })
            .catch((error) => {
                console.log(error);
                setSaves([]);
            });
        return saves;
    };

    React.useEffect(() => {
        loadSaves(state.fileid);
    }, [state.saveid, state.fileid]);

    return (
        <FormControl style={{ width: 300 }} variant="outlined">
            <InputLabel variant="outlined">
                {"Load save"}
            </InputLabel>
            <Select
                value={selected}
                label="save"
                onChange={handleChange}
                fullWidth
            >
                {saves.map((item) => {
                    return (
                        <MenuItem
                            key={crypto.randomUUID()}
                            value={JSON.stringify(item)}
                        >
                            {item.savename == 'autosave' ? `[${item.userid}] autosave` : `[${item.userid}] ${item.timestamp}:  ${item.savename}`}
                        </MenuItem>
                    );
                })}
            </Select>
        </FormControl>
    );
};
