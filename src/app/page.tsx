"use client"
import React from "react";
import Annotator from "./components/annotator/Annotator";
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
  content: string;
  annotations: TextSpan[];
  otherAnnotations: TextSpan[];
}

export class AnnotationTool extends React.Component<AnnotationToolProps, AnnotationToolState> {
  constructor(props: AnnotationToolProps) {
    super(props);
    this.state = {
      annotations: [],
      content: "",
      fileid: "",
      otherAnnotations: [],
    };

  }

  componentDidMount() {
    this.loadAnnotations("", "", "");
  }

  saveAnnotations = (annotations: TextSpan[]) => {
    this.setState({ annotations: annotations })
  }

  loadAnnotations = (fileid: string, userid: string, savename: string) => {
    fetch('/saves')
      .then((res) => res.json())
      .then(res => { this.setState({ content: res['content'] }); })
      .catch(error => console.log(error));
  }

  render() {
    const fileid = this.state.fileid;
    const annotations = this.state.annotations;
    const otherAnnotations = this.state.otherAnnotations;
    const colors = this.props.colors;
    const labels = this.props.labels;
    const content = this.state.content;

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
          annotations={annotations}
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
        labels={Object.keys(defaultColorMap)}
        colors={defaultColorMap}
      />
    </div>
  );
}
