import { createContext, useContext, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ColorMap, { defaultColorMap } from "@/lib/colors";
import { Link, TextSpan, makeLink } from "@/lib/span";
import { cloneDeep } from "lodash";


const UNDO_BUF_MAXLEN = 15;

export enum Status {
    Ready,
    Error,
    LoadingTex,
    LoadingPdf,
    DownloadingTextbooks,
    WaitingForAutoLinks,
}

export type GlobalStateProps = {
    labels: string[],
    colors: ColorMap,

    fileid: string,
    setFileId: (fid: string) => any,

    anchor: string,
    setAnchor: (anchor: string) => any,

    saveid: string,
    setSaveId: (sid: string) => any,

    userid: string,
    setUserId: (uid: string) => any,

    annotations: TextSpan[],
    setAnnotations: (annos: TextSpan[]) => any,

    tex: string,
    setTex: (tex: string) => any,

    pdf: string,
    setPdf: (pdf: string) => any,

    // global status
    status: Status,
    setStatus: (status: Status) => any,

    // undo buffer
    undoBuffer: TextSpan[][],
    setUndoBuffer: (buf: TextSpan[][]) => any,

    undoIndex: number,
    setUndoIndex: (i: number) => any,
}

const defaultState = {
    labels: Object.keys(defaultColorMap),
    colors: defaultColorMap,

    fileid: "",
    setFileId: (_) => {},

    anchor: "",
    setAnchor: (_) => {},

    saveid: "",
    setSaveId: (_) => {},

    userid: "",
    setUserId: (_) => {},

    annotations: [],
    setAnnotations: (_) => {},

    tex: "",
    setTex: () => {},

    pdf: "",
    setPdf: () => {},

    // global status
    status: Status.Ready,
    setStatus: () => {},

    // undo buffer
    undoBuffer: [],
    setUndoBuffer: () => {},

    undoIndex: 0,
    setUndoIndex: () => {},

} as GlobalStateProps;

export async function loadAnnotations(
    state: GlobalStateProps,
    fileid: string,
    userid: string,
    timestamp?: string,
    empty?: boolean,
) {
    try {
        let res: any = {};
        if (empty) {
            console.log("Clearing annotations...");
            res = { annotations: [], fileid: fileid };
        } else {
            const url = `/api/annotations?fileid=${fileid}&userid=${userid}&timestamp=${timestamp ? timestamp : ""}`
            const response = await fetch(url, { mode: "cors" });
            res = await response.json();
        }
        // state.setFileId(res["fileid"]);
        state.setSaveId(res['timestamp']);
        state.setAnnotations(res["annotations"]);
        state.setUndoBuffer([res['annotations']]);
        state.setUndoIndex(1);
        console.log(`Loaded ${res["annotations"].length} annotations`);
        return res["annotations"];
    } catch (e) {
        console.error(e);
    }
}

export async function loadAllAnnotations(state: GlobalStateProps, fileid: string) {
    try {
        const response = await fetch(`/api/annotations/all?fileid=${fileid}`);
        const res = await response.json();
        // Must be done like this, otherwise it calls constantly in the useEffect hook
        // state.setOtherFileAnnotations = res["otherAnnotations"];
        return res['otherAnnotations']
    } catch (e) {
        console.error(e);
    }
}


export async function loadDocument(state: GlobalStateProps, fileid: string) {
    try {
        // URL parameters
        const tex_response = fetch(`/api/tex?fileid=${fileid}`, { mode: "cors" });
        const pdf_response = fetch(`/api/pdf?fileid=${fileid}`, { mode: "cors" });
        const tex_res = await (await tex_response).json();
        state.setTex(tex_res["tex"]);
        state.setFileId(tex_res["fileid"]);
        const pdf_res = await (await pdf_response).json();
        state.setPdf(pdf_res["pdf"]);

    } catch (e) {
        console.error(e);
    }
}


export function updateAnnotations(state: GlobalStateProps, annotations: TextSpan[]) {
    // When we make an update, reset the undo tree. Also, we have to clone it so the in-place updates in toggleLink get tracked
    const buffer = state.undoBuffer
    buffer.push(cloneDeep(annotations));
    const slicedBuffer = buffer.slice(-UNDO_BUF_MAXLEN, undefined);

    state.setUndoBuffer(slicedBuffer);
    state.setUndoIndex(slicedBuffer.length - 1);

    // Now save the annotations
    state.setAnnotations(annotations);
    saveAnnotations(state, annotations, true);
};

export function undoUpdate(state: GlobalStateProps) {
    // Do we have anything to undo?
    if (state.undoBuffer.length == 1 || state.undoIndex == 0) {
        return false;
    }
    // If so, undo it
    const undid = state.undoBuffer[state.undoIndex - 1];
    state.setAnnotations(undid);

    // and decrement the undo index
    state.setUndoIndex(state.undoIndex - 1);
}

export function redoUpdate(state: GlobalStateProps) {
    // Do we have anything to redo?
    if (state.undoBuffer.length == 0 || state.undoIndex + 1 >= state.undoBuffer.length) {
        return false;
    }

    // If so, redo it
    const redid = state.undoBuffer[state.undoIndex + 1];
    state.setAnnotations(redid);

    // and increment the undo index
    state.setUndoIndex(state.undoIndex + 1);
}

export async function saveAnnotations(
    state: GlobalStateProps,
    annotations: TextSpan[],
    autosave: boolean = false,
) {
    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", mode: "cors" },
        body: JSON.stringify({ annotations: annotations }),
    };
    // We handle autosaves differently
    const url = `/api/annotations?fileid=${state.fileid}&userid=${state.userid}&autosave=${autosave}`;

    // POST save and ensure it saved correctly;
    try {
        console.log(`Saving annotations at ${url}`);
        const response = await fetch(url, requestOptions);
        const res = await response.json();
        console.log('Saved!')
        state.setSaveId(res['timestamp'])
        return annotations;
    } catch (e) {
        console.error(e);
        return null;
    }
}

export const toggleLink = (state: GlobalStateProps, source: TextSpan, target: TextSpan) => {
    const link = makeLink(source, target);
    const splitIndex = source.links.findIndex((s) => s.end == link.end && s.start == link.start && s.tag == link.tag && s.fileid == link.fileid);
    if (splitIndex == -1) {
        source.links = [...source.links, link];
    } else {
        source.links = [
            ...source.links.slice(0, splitIndex),
            ...source.links.slice(splitIndex + 1),
        ]
    }
    updateMark(state, source);
    return source;
}

export const removeMark = (state: GlobalStateProps, ts: TextSpan) => {
    const splitIndex = state.annotations.findIndex((s) => s.end == ts.end && s.start == ts.start && s.tag == ts.tag && ts.fileid == s.fileid);
    if (splitIndex >= 0) {
        updateAnnotations(state, [...state.annotations.slice(0, splitIndex), ...state.annotations.slice(splitIndex + 1)]);
    }
};

export const updateMark = (state: GlobalStateProps, anno: TextSpan) => {
    const splitIndex = state.annotations.findIndex((s) => s.end == anno.end && s.start == anno.start && s.tag == anno.tag);
    // If it doesn't already exist in the annotations, add it

    if (splitIndex == -1) {
        updateAnnotations(state, [...state.annotations, anno]);
    } else {
        updateAnnotations(state, [
            ...state.annotations.slice(0, splitIndex),
            anno,
            ...state.annotations.slice(splitIndex + 1),
        ]);
    }
}



export const GlobalState = createContext<GlobalStateProps>(defaultState)
