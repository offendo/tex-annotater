import { GlobalState as GlobaLContext, GlobalState, GlobalStateProps, Status, checkIsAdmin, loadAnnotations, loadAnnotationDiff as loadAnnotationsDiff, loadDocument, redoUpdate, saveAnnotations, undoUpdate } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import Annotater from "@/lib/components/Annotater/Annotater";
import TopBar from "@/lib/components/TopBar/TopBar";
import { TextSpan } from "@/lib/span";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import { theme } from "@/lib/theme";
import "@/style/style.css";
import { useTheme } from "@mui/material";
import { ThemeOptions, ThemeProvider, createTheme } from '@mui/material/styles';
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";


const ComparisonTool = () => {
    // Login stuff
    const { token, userid, setAuth } = useAuth();
    const navigate = useNavigate();

    // URL parameters
    const [queryParameters, setQueryParameters] = useSearchParams();
    const [comparison, setComparison] = useState<any[]>([]);
    const [tags, setTags] = useState<string[]>([]);

    const handleScroll = (e) => {
        const id = parseInt(e.target.id.slice(-1));
        comparison.forEach((annos: any, index: number) => {
            // don't bother scrolling the original div
            if (index == id) {
                return;
            }
            const div = document.getElementById(`scroll-box-${index}`);
            if (div != null) {
                div.scrollTop = e.target.scrollTop;
            }
        });
    }

    // State
    const state = useContext(GlobalState);

    useEffect(() => {
        // if (!token || token.length == 0) {
        //     navigate("/signin");
        // }
        // we're logged in, set admin and load document/annotations;
        checkIsAdmin(state)

        // which tags to compare
        const tags = queryParameters.getAll('tags') || []
        setTags(tags);

        const fileid = queryParameters.get('fileid');
        const timestamps = queryParameters.getAll('timestamps') || []
        if (timestamps.length != 0 && fileid != null) {
            // load tex
            loadDocument(state, fileid, false);

            // load each of the annotations
            loadAnnotationsDiff(state, fileid, userid, timestamps, tags).then((annos) => {
                setComparison(annos);
                console.log('Got diff: ', annos);
                if (annos.length > 0) {
                    state.setAnnotations(annos[0].annotations)
                }
            })
        }
    }, []);
    // http://localhost:3000/comparison?fileid=Abstract%20Algebra.tex&savename=&anchor=&timestampA=2024-07-30%2022:49:49.493816&timestampB=2024-07-30%2022:49:49.493816
    return (
        <ThemeProvider theme={theme}>
            <div style={{ overflow: "hidden" }}>
                <TopBar disableKeybinds={true} />
                <div
                    style={{
                        display: "flex",
                        width: "98vw",
                        margin: 10,
                        overflowX: "scroll",
                        flexWrap: "nowrap",
                    }}
                >
                    {
                        comparison.map((annotations: any, index: number) => {
                            return (
                                <div
                                    id={`annotation-window-${index}`}
                                    key={`annotation-window-${index}`}
                                    style={{ minWidth: "50%", height: "90vh" }}
                                >
                                    <div>
                                        <h3> {annotations.savename} @ {annotations.timestamp} [{annotations.userid}]</h3>
                                    </div>
                                    <div
                                        id={`scroll-box-${index}`}
                                        style={{
                                            minWidth: "50%",
                                            height: "100%",
                                            overflowY: "scroll",
                                        }}
                                        onScroll={handleScroll}
                                    >
                                        <Annotater
                                            key={`viewer-${index}`}
                                            style={{
                                                paddingBottom: "8px",
                                                lineHeight: 2.5,
                                                margin: "10px",
                                            }}
                                            editMode={false}
                                            getSpan={(span: TextSpan) => ({ ...span })}
                                            annotations={annotations.annotations}
                                            diff={annotations.diff}
                                        />
                                    </div>
                                </div>
                            );
                        })
                    }
                </div>
            </div>
        </ThemeProvider >
    );
};

export default ComparisonTool;
