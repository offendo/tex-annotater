"use client"
import React from "react";
import { useSearchParams } from "react-router-dom";
import Annotator from "./components/annotator/Annotator";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";
import { ColorMap } from "./lib/colors"
import { TextSpan } from "./lib/span"
import { defaultColorMap } from "./lib/colors";
import "./style.css";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

type AnnotationToolProps = {
  labels: string[];
  colors: ColorMap;
}

type AnnotationToolState = {
  fileid: string;
  documents: string[];
  userid: string;
  tex: string;
  pdf: string;
  annotations: TextSpan[];
  otherAnnotations: TextSpan[];
}

export class AnnotationTool extends React.Component<AnnotationToolProps, AnnotationToolState> {
  constructor(props: AnnotationToolProps) {
    super(props);
    const queryParameters = new URLSearchParams(window.location.search)
    this.state = {
      annotations: [],
      documents: [],
      tex: "",
      pdf: "",
      otherAnnotations: [],
      fileid: queryParameters.get('fileid') || "",
      userid: queryParameters.get('userid') || "testuser",
      anchor: queryParameters.get('anchor') || "",
    };
  }

  componentDidMount() {
    this.loadAllAnnotations()
    this.listAllDocuments()
    if (this.state.fileid != "") {
      this.loadDocument(this.state.fileid);
      this.loadAnnotations(this.state.fileid, this.state.userid)
    }
    setTimeout(() => {
      if (this.state.anchor.length > 0) {
        console.log("scrolling to ", this.state.anchor, '...');
        const element = document.getElementById(this.state.anchor);
        element.scrollIntoView({ behavior: 'smooth' });
        console.log("done!");
      }
    }, 1000);

  }

  updateAnnotations = (annotations: TextSpan[]) => {
    console.log('updating annotations: ', annotations);
    this.setState({ annotations: annotations })
  }

  saveAnnotations = (fileid: string, userid: string, annotations: TextSpan[], autosave: boolean = false) => {
    console.log('saving ', annotations.length, ' annotations');
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations: annotations })
    };
    // We handle autosaves differently
    const url = autosave ? `/annotations/autosave?fileid=${fileid}&userid=${userid}` : `/annotations?fileid=${fileid}&userid=${userid}`;
    fetch(url, requestOptions)
      .then((res) => res.text())
      .then(res => {
        console.log('Saved annotations: ', res)
      })
      .catch(error => console.log(error));
    return annotations
  }

  loadAllAnnotations = () => {
    fetch(`/annotations/all`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            otherAnnotations: res['otherAnnotations']
          });
      })
      .catch(error => console.log(error));
  }

  loadAnnotations = (fileid: string, userid: string, timestamp?: string) => {
    fetch(`/annotations?fileid=${fileid}&userid=${userid}&timestamp=${timestamp ? timestamp : ""}`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            fileid: res['fileid'],
            annotations: res['annotations']
          }
        );
        console.log('state: ', this.state)
      })
      .catch(error => console.log(error));
  }

  listAllDocuments = () => {
    fetch(`/document/all`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            documents: res['documents'],
          });
      })
      .catch(error => console.log(error));
  }

  loadDocument = (fileid: string) => {
    fetch(`/document?fileid=${fileid}`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            fileid: res['fileid'],
            tex: res['tex'],
            pdf: res['pdf'],
          });
      })
      .catch(error => console.log(error));
  }

  render() {
    const colors = this.props.colors;
    const labels = this.props.labels;

    return (
      <div >
        <TopBar
          loadDocument={this.loadDocument}
          loadAnnotations={this.loadAnnotations}
          saveAnnotations={() => this.saveAnnotations(this.state.fileid, this.state.userid, this.state.annotations, false)}
          allDocuments={this.state.documents}
          userid={this.state.userid}
          fileid={this.state.fileid}
        />
        <div
          style={{
            display: "flex",
            alignContent: "center",
            width: "98vw",
            margin: "10px"
          }}
        >
          <div
            style={{
              flexGrow: 1,
              resize: "horizontal",
              overflow: "scroll",
              width: "49vw",
              height: "90vh",
            }}
          >
            <Annotator
              style={{
                paddingBottom: "8px",
                lineHeight: 3,
                margin: "10px",
              }}
              fileid={this.state.fileid}
              colors={colors}
              labels={labels}
              content={this.state.tex}
              annotations={this.state.annotations}
              otherAnnotations={this.state.otherAnnotations}
              onAddAnnotation={(annos) => this.updateAnnotations(annos)}
              getSpan={(span: TextSpan) => ({ ...span })}
            />
          </div>
          <div
            style={{
              flexGrow: 3,
            }}
          >
            <PdfViewer data={this.state.pdf} />
          </div>
        </div >
      </div>
    );
  }
}


export default function Home() {

  return (
    <div>
      <AnnotationTool
        labels={Object.keys(defaultColorMap)}
        colors={defaultColorMap}
      />
    </div>
  );
}
