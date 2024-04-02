import React from "react";

export interface PDFViewerProps {
    data: string;
}


export function PDFViewer(props: PDFViewerProps) {
    const formatData = (data: string) => {
        if (data.match('https://.*')) {
            return data;
        }
	// else if (data.match('.*\.pdf')){
	//     return 'file://' + data;
	// }
        return "data:application/pdf;base64," + data;
    }

    return (
        <div className="pdf-container">
            {props.data.length > 0 ? <iframe width="100%" height="100%" src={formatData(props.data)} type="application/pdf" /> : ""}
        </div>
    );
}
export default PDFViewer;
