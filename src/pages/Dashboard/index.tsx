import { GlobalState as GlobalContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import PDFViewer from "@/lib/components/PDFViewer";
import { Document, DocumentSelector } from "@/lib/components/TopBar/DocumentSelectorModal";
import { SaveSelector } from "@/lib/components/TopBar/SaveSelector";
import TopBar from "@/lib/components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { theme } from "@/lib/theme";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import "@/style/style.css";
import { Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { ThemeProvider } from '@mui/material/styles';
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DataTable from "@/lib/components/Table";

// TODO: Rewrite the document selector modal to be a non-modal thing, and then insert it into here so we can browse through them all.
// A list of files which have annotations from us, and each collapses into a list of saves from that file

type UserData = {
    userid: string
    f1: number
    annoCount: number
}

type SaveData = {
    fileid: string;
    start: number;
    end: number;
    userData: UserData[];
}

type HeadCell = {

}

const testData = [
    { id: "Abstract Algebra", fileid: "Abstract Algebra", start: 100, end: 300, userData: [{ userid: "nilay", f1: 80.4, annoCount: 25 }, { userid: "jeff", f1: 75.5, annoCount: 22 }, { userid: "test", f1: 90.2, annoCount: 28 }] },
    { id: "Group Theory - Milne", fileid: "Group Theory - Milne", start: 300, end: 900, userData: [{ userid: "nilay", f1: 85.4, annoCount: 25 }, { userid: "jeff", f1: 25.5, annoCount: 22 }, { userid: "test", f1: 50.2, annoCount: 28 }] },
    { id: "Real Analysis", fileid: "Real Analysis", start: 1000, end: 20000, userData: [{ userid: "nilay", f1: 70.4, annoCount: 25 }, { userid: "jeff", f1: 85.5, annoCount: 22 }, { userid: "test", f1: 50.8, annoCount: 28 }] },
]

const users = [... new Set(testData.flatMap((row) => row.userData.map((x) => x.userid)))]

const columns: GridColDef[] = [
    { field: 'fileid', headerName: 'File ID', width: 200, sortable: true },
    { field: 'start-end', headerName: 'Start/End', width: 100, sortable: false, valueGetter: ({ row }) => { return `${row.start}/${row.end}` } },
    ...users.map((user) => {
        return {
            field: user,
            headerName: user,
            width: 100,
            sortable: true,
            valueGetter: ({ row }) => { return row.userData.filter((u) => u.userid == user)?.[0]?.f1 }
        }
    })
]

type DashboardProps = {
}

const Dashboard = (props: DashboardProps) => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();

    // Global State
    const state = useContext(GlobalState);

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // Page state
    const [saveData, setSaveData] = useState<SaveData[]>([]);

    async function loadSaveData() {
        try {
            console.log("Loading save data")
        } catch (e) {
            console.error(e)
        }
    }

    React.useEffect(() => {
        loadSaveData();
    }, [])

    return (
        <ThemeProvider theme={theme}>
            <div>
                <TopBar />
                <div
                    style={{
                        display: "flex",
                        alignContent: "center",
                        width: "98vw",
                        margin: "10px",
                    }}
                >
                    <div style={{ flexGrow: 3 }}>
                        <Typography variant="h5"> Dashboard </Typography >
                        <DataTable columns={columns} rows={testData} onSelect={(x) => { console.log(x) }} allowMultiple={false} />
                    </div>
                </div>
            </div>
        </ThemeProvider >
    );
};

export default Dashboard;
