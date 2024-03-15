import * as React from 'react';
import { Divider } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import SearchIcon from '@mui/icons-material/Search';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SaveIcon from '@mui/icons-material/Save';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import FileOpenIcon from '@mui/icons-material/FileOpen';


type SaveFileProps = {
    fileid: string
    userid: string
    loadAnnotations: (fileid: string, userid: string, timestamp?: string) => any
}

const SaveFileSelector = (props: SaveFileProps) => {
    const [selected, setSelected] = React.useState('');
    const [saves, setSaves] = React.useState<any[]>([]);

    // if (props.fileid != "") {
    //     props.loadAnnotations(props.fileid, props.userid);
    // }

    const handleChange = (event: SelectChangeEvent) => {
        const s = JSON.parse(event.target.value);
        setSelected(event.target.value);
        props.loadAnnotations(s['fileid'], s['userid'], s['timestamp']);
    };

    const loadSaves = (fileid: string) => {
        fetch(`/saves?fileid=${fileid}`)
            .then((res) => res.json())
            .then(res => {
                setSaves(res['saves']);
            })
            .catch(error => { console.log(error); setSaves([]); });
        return saves;
    };

    React.useEffect(() => {
        loadSaves(props.fileid);
        props.loadAnnotations(props.fileid, props.userid)
    }, [props.fileid, props.userid]);

    return (
        <Box sx={{ minWidth: 200, marginLeft: "20px", marginRight: "20px", }}>
            <FormControl fullWidth variant="filled">
                <InputLabel variant="filled" style={{ color: "#ffffff80" }} id="demo-simple-select-label">Load annotations</InputLabel>
                <Select
                    style={{ color: "#ffffff80" }}
                    value={selected}
                    label="save"
                    onChange={handleChange}
                >
                    {saves.map((item) => {
                        return (
                            <MenuItem key={crypto.randomUUID()} value={JSON.stringify(item)} >
                                {`${item['timestamp']} (${item['userid']})`}
                            </MenuItem >
                        );
                    })}
                </Select>
            </FormControl>
        </Box>
    );
}


type TopBarProps = {
    saveAnnotations: () => any,
    userid: string
    fileid: string
    loadAnnotations: (fileid: string, userid: string, timestamp?: string) => any,
    loadDocument: (fileid: string) => any
    allDocuments: string[]
}

export default function TopBar(props: TopBarProps) {
    const [fileid, setFileid] = React.useState(props.fileid);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar style={{ backgroundColor: "var(--solarized-base03)" }} position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        sx={{ mr: 2 }}
                        onClick={(e) => { props.saveAnnotations() }}
                    >
                        <SaveIcon />
                    </IconButton>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        sx={{ mr: 2 }}
                        onClick={() => { console.log('loading annotations') }}
                    >
                        <FolderOpenIcon />
                    </IconButton>
                    <Divider style={{ color: "white", backgroundColor: "white" }} orientation='vertical' />
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
                        style={{ justifyContent: "center" }}
                    >
                        LaTeX Annotater
                    </Typography>
                    <div>
                        <span style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <div>
                                <Autocomplete
                                    options={props.allDocuments}
                                    sx={{ width: 300 }}
                                    style={{ color: "#ffffff80" }}
                                    value={fileid}
                                    onChange={(e) => {
                                        props.loadDocument(e.target.textContent);
                                        setFileid(e.target.textContent);
                                    }}
                                    renderInput={(params: any) =>
                                        <TextField
                                            {...params}
                                            variant="filled"
                                            //InputProps={{ style: { color: '#ffffff80' } }}
                                            InputLabelProps={{ style: { color: '#ffffff80' } }}
                                            label="Load paper"
                                        />
                                    }
                                />
                            </div>
                            <SaveFileSelector fileid={fileid} userid={props.userid} loadAnnotations={props.loadAnnotations} />
                        </span>
                    </div>
                </Toolbar>
            </AppBar>
        </Box>
    );
}
