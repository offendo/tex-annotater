"use client"
import { AnnotationTool } from "./components/TextHighlighter"
import { defaultColorMap } from "./lib/colors";

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
