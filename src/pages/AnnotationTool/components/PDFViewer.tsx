import React, { useContext } from "react";
import { GlobalState, GlobalStateProps } from "@/lib/GlobalState";

export interface PDFViewerProps {}


export function PDFViewer(props: PDFViewerProps) {
    const state = useContext<GlobalStateProps>(GlobalState);

    const formatData = (data: string) => {
        if (data.match('https://.*')) {
            return data;
        }
        return "data:application/pdf;base64," + data;
    }

    return (
        <div className="pdf-container">
            {state.pdf.length > 0 ? <iframe width="100%" height="100%" src={formatData(state.pdf)} type="application/pdf" /> : ""}
        </div>
    );
}
export default PDFViewer;
