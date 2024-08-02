import { GlobalState as GlobalContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import PDFViewer from "@/lib/components/PDFViewer";
import TopBar from "@/lib/components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { theme } from "@/lib/theme";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import "@/style/style.css";
import { ThemeProvider } from '@mui/material/styles';
import React, { useCallback, useEffect, useState, useContext } from "react";
import { pdfjs } from "react-pdf";
import { useNavigate, useSearchParams } from "react-router-dom";


pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const AnnotationTool = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // State
    const state = useContext(GlobalState);

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    const fileid = queryParameters.get("fileid") || state.fileid
    const timestamp = queryParameters.get("timestamp") || state.timestamp
    const savename = queryParameters.get("savename") || state.savename

    // handle what happens on key press
    const handleKeyPress = useCallback((event: any) => {
        /* Undo/Redo
           ========= */
        if ((event.ctrlKey || event.metaKey) && event.key == 'z') {
            undoUpdate(state);
        }
        else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key == 'Z') {
            redoUpdate(state);
        }
    }, [state]);

    useEffect(() => {
        // attach the event listener
        document.addEventListener('keydown', handleKeyPress);

        // remove the event listener
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);

    useEffect(() => {
        if (!token || token.length == 0) {
            navigate("/signin");
        }
        // we're logged in, set admin and load document/annotations;
        checkIsAdmin(state)

        if (fileid != "" && !state.tex) {
            loadDocument(state, fileid)
        }
        if (state.fileid != "" && timestamp != "") {
            loadAnnotations(state, fileid, userid, timestamp)
            // Wait 1 second before trying to scroll, gives the DOM time to load in.
            // Probably a better way to do this but I tried a few things and it didn't work.
            // Retry x5
            if (anchor.length > 0) {
                let tries = 0;
                var repeater = setInterval(() => {
                    if (tries < 3) {
                        if (!isNaN(anchor)) {
                            const percent = parseFloat(anchor);
                            console.log(`jumping to ${percent}%, fudged by -0.0003 = ${percent - 0.0003}`)
                            jumpToPercent(percent - 0.0003); // fudge the jump percent slightly
                        } else {
                            console.log(`jumping to ${anchor}`)
                            jumpToElement(anchor);
                        }
                        tries += 1;
                    } else {
                        clearInterval(repeater);
                    }
                }, 2000)
            }
        }
    }, []);

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
                            editMode={true}
                            getSpan={(span: TextSpan) => ({ ...span })}
                        />
                    </div>
                    <div style={{ flexGrow: 3 }}>
                        <PDFViewer />
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default AnnotationTool;
