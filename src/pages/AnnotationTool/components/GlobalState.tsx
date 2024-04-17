import { createContext, useContext, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ColorMap, { defaultColorMap } from "@/lib/colors";
import { Link, TextSpan, makeLink } from "@/lib/span";


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
        console.log(`Loaded ${res["annotations"].length} annotations`);
        return res["annotations"];
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


export async function updateAnnotations(state: GlobalStateProps, annotations: TextSpan[]) {
    state.setAnnotations(annotations);
    saveAnnotations(state, annotations, true);
    console.log("Just autosaved: ", annotations);
};

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
        const res = await response.text();
        console.log(res)
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
