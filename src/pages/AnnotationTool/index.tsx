import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Annotater from "./components/Annotater/Annotater";
import PDFViewer from "./components/PDFViewer";
import TopBar from "./components/TopBar";
import { TextSpan } from "@/lib/span";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import { defaultColorMap } from "@/lib/colors";
import "@/style/style.css";
import { pdfjs } from "react-pdf";
import useAuth from "../Token";
import { GlobalState as GlobaLContext, GlobalStateProps, loadAnnotations, loadDocument } from "./components/GlobalState";

pdfjs.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";


const AnnotationTool = () => {

    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();

    // State
    const [fileid, setFileId] = useState<string>(queryParameters.get("fileid") || "");
    const [anchor, setAnchor] = useState<string>(queryParameters.get("anchor") || "");
    const [tex, setTex] = useState<string>("");
    const [pdf, setPdf] = useState<string>("");
    const [saveid, setSaveId] = useState<string>(queryParameters.get("saveid") || "");
    const [annotations, setAnnotations] = useState<TextSpan[]>([]);

    const state: GlobalStateProps = {
        colors: defaultColorMap,
        labels: Object.keys(defaultColorMap),
        userid: userid,
        setUserId: () => {},
        fileid: fileid,
        setFileId: setFileId,
        anchor: anchor,
        setAnchor: setAnchor,
        saveid: saveid,
        setSaveId: setSaveId,
        pdf: pdf,
        setPdf: setPdf,
        tex: tex,
        setTex: setTex,
        annotations: annotations,
        setAnnotations: setAnnotations,
    }

    useEffect(() => {
        if (!token || token.length == 0) {
            navigate("/signin");
        }

        if (fileid != "") {
            loadAnnotations(state, saveid)
            loadDocument(state, fileid)
        }

        // Wait 1 second before trying to scroll, gives the DOM time to load in.
        // Probably a better way to do this but I tried a few things and it didn't work.
        // Retry x5
        let tries = 0;
        var repeater = setInterval(() => {
            if (tries < 3) {
                if (anchor.length > 0) {
                    if (!isNaN(anchor)) {
                        const percent = parseFloat(anchor);
                        console.log(`jumping to ${percent}%, fudged by -0.0003 = ${percent - 0.0003}`)
                        jumpToPercent(percent - 0.0003); // fudge the jump percent slightly
                    } else {
                        console.log(`jumping to ${anchor}`)
                        jumpToElement(anchor);
                    }
                }
                tries += 1;
            } else {
                clearInterval(repeater);
            }
        }, 2000)
    }, []);

    return (
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
                        <PDFViewer/>
                    </div>
                </div>
            </GlobaLContext.Provider>
        </div>
    );
};

export default AnnotationTool;
