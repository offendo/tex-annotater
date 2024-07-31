import { GlobalState as GlobaLContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import TopBar from "@/lib/components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import "@/style/style.css";
import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


export const themeOptions: ThemeOptions = {
    palette: {
        mode: 'light',
        primary: {
            main: '#003c6c',
            contrastText: '#fffce6',
        },
        secondary: {
            main: '#fdc700',
        },
    },
    typography: {
        fontFamily: 'Roboto',
    },
};
const theme = createTheme(themeOptions);


const ComparisonTool = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // State
    const state = useContext(GlobalState);

    useEffect(() => {
        if (!token || token.length == 0) {
            navigate("/signin");
        }
        // we're logged in, set admin and load document/annotations;
        checkIsAdmin(state)

        if (state.fileid != "") {
            loadDocument(state, state.fileid)
        }
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <div>
                <GlobaLContext.Provider value={state}>
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
                                getSpan={(span: TextSpan) => ({ ...span })}
                            />
                        </div>
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
                                getSpan={(span: TextSpan) => ({ ...span })}
                            />
                        </div>
                    </div>
                </GlobaLContext.Provider>
            </div>
        </ThemeProvider>
    );
};

export default ComparisonTool;
