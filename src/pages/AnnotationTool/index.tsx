import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Annotater from "./components/Annotater/Annotater";
import PDFViewer from "./components/PDFViewer";
import TopBar from "./components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import { defaultColorMap } from "@/lib/colors";
import "@/style/style.css";
import { pdfjs } from "react-pdf";
import useAuth from "@/lib/Token";
import { GlobalState as GlobaLContext, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';


pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

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


const AnnotationTool = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // State
    const [fileid, setFileId] = useState<string>(queryParameters.get("fileid") || "");
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [anchor, setAnchor] = useState<string>(queryParameters.get("anchor") || "");
    const [tex, setTex] = useState<string>("");
    const [pdf, setPdf] = useState<string>("");
    const [timestamp, setTimestamp] = useState<string>(queryParameters.get("timestamp") || "");
    const [savename, setSavename] = useState<string>(queryParameters.get("savename") || "");
    const [annotations, setAnnotations] = useState<TextSpan[]>([]);
    const [editing, setEditing] = useState<TextSpan | null>(null);
    const [showAllAnnotations, setShowAllAnnotations] = useState(false);
    const [status, setStatus] = useState<Status>(Status.Ready);
    const [undoBuffer, setUndoBuffer] = useState<TextSpan[][]>([]);
    const [undoIndex, setUndoIndex] = useState<number>(0);

    const state: GlobalStateProps = {
        colors: defaultColorMap,
        labels: Object.keys(defaultColorMap),
        userid: userid,
        setUserId: () => {},
        fileid: fileid,
        setFileId: setFileId,
        isAdmin: isAdmin,
        setIsAdmin: setIsAdmin,
        anchor: anchor,
        setAnchor: setAnchor,
        timestamp: timestamp,
        setTimestamp: setTimestamp,
        savename: savename,
        setSavename: setSavename,
        pdf: pdf,
        setPdf: setPdf,
        tex: tex,
        setTex: setTex,
        editing: editing,
        setEditing: setEditing,
        annotations: annotations,
        setAnnotations: setAnnotations,
        showAllAnnotations: showAllAnnotations,
        setShowAllAnnotations: setShowAllAnnotations,
        status: status,
        setStatus: setStatus,
        undoBuffer: undoBuffer,
        setUndoBuffer: setUndoBuffer,
        undoIndex: undoIndex,
        setUndoIndex: setUndoIndex,
    }
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

        if (state.fileid != "" && !state.tex) {
            loadDocument(state, fileid)
        }
        if (fileid != "" && timestamp != "") {
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
                                getSpan={(span: TextSpan) => ({ ...span })}
                            />
                        </div>
                        <div style={{ flexGrow: 3 }}>
                            <PDFViewer />
                        </div>
                    </div>
                </GlobaLContext.Provider>
            </div>
        </ThemeProvider>
    );
};

export default AnnotationTool;
