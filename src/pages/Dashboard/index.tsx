import { GlobalState as GlobalContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import PDFViewer from "@/lib/components/PDFViewer";
import { DocumentSelector, Document } from "@/lib/components/TopBar/DocumentSelectorModal";
import { SaveSelector } from "@/lib/components/TopBar/SaveSelector";
import TopBar from "@/lib/components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { theme } from "@/lib/theme";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import "@/style/style.css";
import { Typography } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import React, { useCallback, useEffect, useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Grid from "@mui/material/Grid";

// TODO: Rewrite the document selector modal to be a non-modal thing, and then insert it into here so we can browse through them all.
// A list of files which have annotations from us, and each collapses into a list of saves from that file

type SaveData = {
    document: Document
    final: boolean
    savename: string
    timestamp: string
    fileid: string
    annotations: number
    score: number
}

type UserData = {
    userid: string
    saves: SaveData[]
}

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
    const [userData, setUserData] = useState<UserData>({ saves: [], userid: queryParameters.get("user") || userid });

    async function loadUserData() {
        try {
            const response = await fetch(`/api/user?userid=${userData.userid}`, { mode: "cors" });
            const json = await response.json();
            console.log(json['saves'].map(x => { return { fileid: x.fileid, scores: x.scores } }));
            setUserData(json);
        } catch (e) {
            console.error(e);
        }
    }
    React.useEffect(() => {
        loadUserData();
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
                    <div
                        id="scroll-box"
                        style={{
                            flexGrow: 1,
                            resize: "horizontal",
                            overflow: "scroll",
                            width: "60vw",
                            height: "90vh",
                        }}
                    >
                        <Annotater
                            style={{
                                paddingBottom: "8px",
                                lineHeight: 3,
                                margin: "10px",
                            }}
                            editMode={false}
                        />
                    </div>
                    <div style={{ flexGrow: 3 }}>
                        <Typography variant="h5"> {userData.userid}'s Dashboard </Typography >
                        <div>
                            Finalized Annotations: {userData.saves.filter((save: SaveData) => save.final).length} / {userData.saves.length}
                        </div>
                        <div>
                            Avg. F1 Score: {
                                userData.saves.length > 0
                                    ? userData.saves.map((x) => x.score).filter(x => x > 0).reduce((a, b) => a + b, 0) / userData.saves.filter(x => x.score > 0).length
                                    : 0.0}
                        </div>
                        <SaveSelector
                            onSelectSave={(save, index) => {
                                loadDocument(state, save.fileid, false);
                                loadAnnotations(state, save.fileid, userData.userid, save.timestamp, save.savename);
                            }}
                            showFileId={true}
                            showAllFiles={true}
                            allowDelete={true}
                            allowExport={true}
                            allowMarkFinal={true}
                        />
                    </div>
                </div>
            </div>
        </ThemeProvider >
    );
};

export default Dashboard;
