import { GlobalState } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import Annotater from "@/lib/components/Annotater/Annotater";
import TopBar from "@/lib/components/TopBar/TopBar";
import { theme } from "@/lib/theme";
import { Typography } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles';
import React, { useState, useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Grid from "@mui/material/Grid";

export const Dashboard = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // Global State
    const state = useContext(GlobalState);

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // Page state
    const [user, setUser] = useState<string>(queryParameters.get("user") || state.userid);


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
                            editMode={false} />
                    </div>
                    <div style={{ flexGrow: 3 }}>
                        <Typography variant="h5"> {user}'s Dashboard </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={3}>
                                1
                            </Grid>
                            <Grid item xs={3}>
                                1
                            </Grid>
                            <Grid item xs={3}>
                                1
                            </Grid>
                            <Grid item xs={3}>
                                1
                            </Grid>
                        </Grid>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};
