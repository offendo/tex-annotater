"use client"
import React from "react";
import Annotator from "./components/annotator/Annotator";
import PdfViewer from "./components/PdfViewer";
import TopBar from "./components/TopBar";
import { ColorMap } from "./lib/colors"
import { TextSpan } from "./lib/span"
import { defaultColorMap } from "./lib/colors";
import "./style.css";

type AnnotationToolProps = {
  labels: string[];
  colors: ColorMap;
}

type AnnotationToolState = {
  fileid: string;
  userid: string;
  tex: string;
  pdf: string;
  annotations: TextSpan[];
  otherAnnotations: TextSpan[];
}

export class AnnotationTool extends React.Component<AnnotationToolProps, AnnotationToolState> {
  constructor(props: AnnotationToolProps) {
    super(props);
    this.state = {
      annotations: [],
      tex: "",
      pdf: "",
      fileid: "",
      userid: "",
      otherAnnotations: [],
    };

  }

  componentDidMount() {
    this.loadDocument("test.tex");
    this.loadAllAnnotations("test.tex")
  }

  updateAnnotations = (annotations: TextSpan[]) => {
    this.setState({ annotations: annotations })
  }

  saveAnnotations = (fileid: string, userid: string, annotations: TextSpan[], autosave: boolean = false) => {
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

  loadAllAnnotations = (fileid: string) => {
    fetch(`/annotations/all?fileid=${fileid}`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            fileid: res['fileid'],
            otherAnnotations: res['otherAnnotations']
          });
        console.log(this.state)
      })
      .catch(error => console.log(error));
  }

  loadAnnotations = (fileid: string, userid: string, timestamp: string) => {
    fetch(`/annotations?fileid=${fileid}&userid=${userid}&timestamp=${timestamp}`)
      .then((res) => res.json())
      .then(res => {
        this.setState(
          {
            fileid: res['fileid'],
            annotations: res['annotations']
          }
        );
        console.log('new annotations: ', res['annotations'])
      })
      .catch(error => console.log(error));
  }


  loadDocument = (fileid: string) => {
    fetch(`/document?fileid=${fileid}`)
      .then((res) => res.json())
      .then(res => {
        console.log(res);
        this.setState(
          {
            fileid: res['fileid'],
            tex: res['tex'],
            pdf: res['pdf'],
          });
        console.log(this.state)
      })
      .catch(error => console.log(error));
  }

  render() {
    const fileid = this.state.fileid;
    const annotations = this.state.annotations;
    const otherAnnotations = this.state.otherAnnotations;
    const colors = this.props.colors;
    const labels = this.props.labels;
    const tex = this.state.tex;

    return (
      <div >
        <TopBar
          loadDocument={this.loadDocument}
          loadAnnotations={this.loadAnnotations}
          saveAnnotations={() => this.saveAnnotations(this.state.fileid, this.state.userid, this.state.annotations, false)}
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
              fileid={fileid}
              colors={colors}
              labels={labels}
              content={tex}
              annotations={annotations}
              otherAnnotations={otherAnnotations}
              onAddAnnotation={(annos) => this.updateAnnotations(annos)}
              getSpan={(span: TextSpan) => ({ ...span })}
            />
          </div>
          <div
            style={{
              flexGrow: 3,
            }}
          >
            <PdfViewer filepath="https://arxiv.org/pdf/0705.1690.pdf" />
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
