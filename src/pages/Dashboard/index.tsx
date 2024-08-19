import { GlobalState as GlobalContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import PDFViewer from "@/lib/components/PDFViewer";
import { DocumentSelectorModal } from "@/lib/components/TopBar/DocumentSelectorModal";
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
    savename: string
    timestamp: string
    fileid: string
    annotations: number
    averageScore: number
}

type UserData = {
    userid: string
    saves: SaveData[]
}

const Dashboard = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // Global State
    const state = useContext(GlobalState);

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // Page state
    const [user, setUser] = useState<string>(queryParameters.get("user") || state.userid)

    const [userData, setUserData] = useState<UserData>({ saves: [], userid: user });

    React.useEffect(() => {
        setUserData({ saves: [], userid: user })
    }, [user])


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
                            width: "49vw",
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
                        <Typography variant="h5"> {user}'s Dashboard </Typography >
                        <div>
                            # Complete Annotations: {userData.saves.length}
                        </div>
                        <div>
                            Avg. F1 Score: {userData.saves.length > 0 ? userData.saves.map((x) => x.averageScore).reduce((a, b) => a + b, 0) / userData.saves.length : 0.0}
                        </div>
                        <Grid container spacing={1}>
                            <Grid item xs={3}> Export </Grid>
                            <Grid item xs={3}> File ID </Grid>
                            <Grid item xs={3}> Savename </Grid>
                            <Grid item xs={3}> Timestamp </Grid>
                        </Grid>
                    </div>
                </div>
            </div>
        </ThemeProvider >
    );
};

export default Dashboard;
