import React from "react";

export interface PdfViewerProps {
    filepath: string;
}


export function PdfViewer(props: PdfViewerProps) {
    return (
        <div className="pdf-container">
            <iframe src={props.filepath} style={{ width: "100%", height: "100%" }} />
        </div>
    );
}
export default PdfViewer;
