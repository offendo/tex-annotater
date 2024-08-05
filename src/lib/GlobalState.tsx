import { createContext, useContext, useState } from "react";
import ColorMap, { defaultColorMap } from "@/lib/colors";
import { Link, TextSpan, makeLink } from "@/lib/span";
import { cloneDeep } from "lodash";
import { toggle } from "./utils";


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

    timestamp: string,
    setTimestamp: (time: string) => any,

    savename: string,
    setSavename: (sname: string) => any,

    userid: string,
    setUserId: (uid: string) => any,

    isAdmin: boolean,
    setIsAdmin: (admin: boolean) => any,

    editing: TextSpan | null,
    setEditing: (anno: TextSpan | null) => any,

    annotations: TextSpan[],
    setAnnotations: (annos: TextSpan[]) => any,

    showAllAnnotations: boolean,
    setShowAllAnnotations: (val: boolean) => any,

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

    timestamp: "",
    setTimestamp: (_) => {},

    savename: "",
    setSavename: (_) => {},

    userid: "",
    setUserId: (_) => {},

    isAdmin: false,
    setIsAdmin: (_) => {},

    editing: null,
    setEditing: (_) => {},

    annotations: [],
    setAnnotations: (_) => {},

    showAllAnnotations: false,
    setShowAllAnnotations: (_) => {},

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

export const checkIsAdmin = async (state: GlobalStateProps) => {
    const url = `/api/admin?userid=${state.userid}`;
    const response = await fetch(url, { mode: "cors" });
    const json = await response.json();
    state.setIsAdmin(json['isAdmin']);
}

export async function loadAnnotations(
    state: GlobalStateProps,
    fileid: string,
    userid: string,
    timestamp?: string,
    savename?: string,
    empty?: boolean,
) {
    try {
        let res: any = {};
        if (empty) {
            console.log("Clearing annotations...");
            res = { annotations: [], fileid: fileid, savename: "", timestamp: "" };
        } else {
            const url = `/api/annotations?fileid=${fileid}&userid=${userid}&timestamp=${timestamp ? timestamp : ""}&savename=${savename ? savename : ""}`
            const response = await fetch(url, { mode: "cors" });
            res = await response.json();
        }
        state.setFileId(res["fileid"]);
        state.setTimestamp(res['timestamp']);
        state.setSavename(res['savename']);
        state.setAnnotations(res["annotations"]);
        state.setUndoBuffer([res['annotations']]);
        state.setUndoIndex(1);
        console.log(`Loaded ${res["annotations"].length} annotations`);
        return res;
    } catch (e) {
        console.error(e);
    }
}

export async function loadAnnotationDiff(
    state: GlobalStateProps,
    fileid: string,
    userid: string,
    timestamps: string[],
    tags: string[],
) {
    try {
        let res: any = {};
        const url = `/api/annotations/diff?fileid=${fileid}&userid=${userid}&timestamps=${timestamps.join(';')}&tags=${tags.join(';')}`
        const response = await fetch(url, { mode: "cors" });
        res = await response.json();
        console.log(`Loaded diffs of ${res.length} save files.`);
        return res;
    } catch (e) {
        console.error(e);
        return {};
    }
}

export async function loadDocument(state: GlobalStateProps, fileid: string, loadPdf: boolean = true) {
    try {
        // Set TeX
        const tex_response = fetch(`/api/tex?fileid=${fileid}`, { mode: "cors" });
        const tex_res = await (await tex_response).json();
        state.setTex(tex_res["tex"]);
        state.setFileId(tex_res["fileid"]);

        // Set pdf
        let pdf_res = null;
        if (loadPdf) {
            const pdf_response = fetch(`/api/pdf?fileid=${fileid}`, { mode: "cors" });
            pdf_res = await (await pdf_response).json();
            state.setPdf(pdf_res["pdf"]);
        }

        return { tex: tex_res['tex'], pdf: loadPdf ? pdf_res['pdf'] : null }

    } catch (e) {
        console.error(e);
        return { tex: null, pdf: null }
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
    saveAnnotations(state, annotations, true, state.savename);

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
    savename: string = "",
) {
    const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", mode: "cors" },
        body: JSON.stringify({ annotations: annotations }),
    };
    // We handle autosaves differently
    console.log(`Saving with fileid ${state.fileid}`);
    const url = `/api/annotations?fileid=${state.fileid}&userid=${state.userid}&autosave=${autosave}&savename=${savename}`;

    // POST save and ensure it saved correctly;
    try {
        const response = await fetch(url, requestOptions);
        const res = await response.json();
        state.setTimestamp(res['timestamp']);
        state.setSavename(res['savename']);
        state.setFileId(res['fileid']);
        console.log('Saved annotations: ', res['savename'], ' timestamp ', res['timestamp'])
        return res['timestamp'];
    } catch (e) {
        console.error(e);
        return false;
    }
}

export const toggleLink = (state: GlobalStateProps, source: TextSpan, target: TextSpan, forceEnable: boolean = false) => {
    const link = makeLink(source, target);
    source.links = toggle(source.links, link, (a, b) => a.source == b.source && a.target == b.target, forceEnable);
    updateMark(state, source);
    return source;
}

export const removeMark = (state: GlobalStateProps, ts: TextSpan) => {
    const newAnnos = toggle(state.annotations, ts, (a, b) => a.end == b.end && a.start == b.start && a.tag == b.tag && a.fileid == b.fileid);
    updateAnnotations(state, newAnnos);
};

export const toggleEditStatus = (state: GlobalStateProps, anno: TextSpan | null) => {
    if (anno == null || (state.editing && state.editing.annoid == anno.annoid)) {
        state.setEditing(null);
    } else {
        state.setEditing(anno);
    }
}

export const updateMark = (state: GlobalStateProps, anno: TextSpan) => {
    const newAnnos = toggle(state.annotations, anno, (a, b) => a.annoid == b.annoid)
    updateAnnotations(state, newAnnos);
    state.setEditing(null);
}



export const GlobalState = createContext<GlobalStateProps>(defaultState)
