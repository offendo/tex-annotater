import React from "react";
import { Document } from 'react-pdf'

export interface PdfViewerProps {
    data: string;
}


export function PdfViewer(props: PdfViewerProps) {
    const formatData = (data: string) => {
        if (data.match('https://.*')) {
            return data;
        }
        return "data:application/pdf;base64," + data;
    }

    return (
        <div className="pdf-container">
            {props.data.length > 0 ? <iframe width="100%" height="100%" src={formatData(props.data)} type="application/pdf"/> : ""}
        </div>
    );
}
export default PdfViewer;
