// React
import React, { useState } from "react";
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

// Styles
import "@/style/globals.css";
import "@/style/style.css";

// Pages
import AnnotationTool from "@/pages/AnnotationTool";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import ComparisonTool from './pages/ComparisonTool';

// Libs
import { GlobalState as GlobalContext, GlobalStateProps, Status } from "@/lib/GlobalState";
import useAuth from "@/lib/Token";
import { defaultColorMap } from "@/lib/colors";
import { TextSpan } from "@/lib/span";
import Dashboard from "./pages/Dashboard/Dashboard";


export default function App() {

    const { token, userid, setAuth } = useAuth();
    const [fileid, setFileId] = useState<string>("");
    const [isAdmin, setIsAdmin] = useState<boolean>(false);
    const [anchor, setAnchor] = useState<string>("");
    const [tex, setTex] = useState<string>("");
    const [pdf, setPdf] = useState<string>("");
    const [timestamp, setTimestamp] = useState<string>("");
    const [savename, setSavename] = useState<string>("");
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

    return (
        <Router>
            <GlobalContext.Provider value={state}>
                <Routes>
                    <Route path="/" element={<AnnotationTool />} />
                    <Route path="/comparison" element={<ComparisonTool />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
            </GlobalContext.Provider>
        </Router>
    );
}
