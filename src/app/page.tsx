"use client"
import React from "react";
import Annotator from "./components/annotator/Annotator";
import { ColorMap } from "./lib/colors"
import { TextSpan } from "./lib/span"
import { defaultColorMap } from "./lib/colors";
import "./style.css";

type AnnotationToolProps = {
  fileid: string;
  labels: string[];
  colors: ColorMap;
  content: string;
  annotations: TextSpan[];
  otherAnnotations: TextSpan[];
}

type AnnotationToolState = {
  annotations: TextSpan[];
}

export class AnnotationTool extends React.Component<AnnotationToolProps, AnnotationToolState> {
  constructor(props: AnnotationToolProps) {
    super(props);
    this.state = {
      annotations: [],
    };
  }

  saveAnnotations = (annotations: TextSpan[]) => {
    this.setState({ annotations: annotations })
  }

  loadAnnotations = (fileid: string, userid: string, savename: string) => {

  }

  render() {
    const fileid = this.props.fileid;
    // const annotations = this.props.annotations;
    const otherAnnotations = this.props.otherAnnotations;
    const colors = this.props.colors;
    const labels = this.props.labels;
    const content = this.props.content;

    return (
      <div>
        <Annotator
          style={{
            paddingBottom: "8px",
            lineHeight: 3,
            margin: "100px",
          }}
          fileid={fileid}
          colors={colors}
          labels={labels}
          content={content}
          annotations={this.state.annotations}
          otherAnnotations={otherAnnotations}
          onAddAnnotation={this.saveAnnotations}
          getSpan={(span: TextSpan) => ({ ...span })}
        />
      </div>
    );
  }
}


export default function Home() {
  return (
    <div>
      <AnnotationTool
        fileid={"test.tex"}
        labels={Object.keys(defaultColorMap)}
        colors={defaultColorMap}
        content={"This is a test"}
        annotations={[]}
        otherAnnotations={[]}
      />
    </div>
  );
}
