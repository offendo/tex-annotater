import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Annotater from "./components/Annotater/Annotater";
import PDFViewer from "./components/PDFViewer";
import TopBar from "./components/TopBar";
import { ColorMap } from "@/lib/colors";
import { TextSpan } from "@/lib/span";
import { jumpToElement, jumpToPercent } from "@/lib/utils";
import { defaultColorMap } from "@/lib/colors";
import "@/style/style.css";
import { pdfjs } from "react-pdf";
import useAuth from "../Token";

pdfjs.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const AnnotationTool = () => {
  const labels: string[] = Object.keys(defaultColorMap);
  const colors: ColorMap = defaultColorMap;

  // State
  const [queryParameters, setQueryParameters] = useSearchParams();
  const [fileid, setFileId] = useState<string>(
    queryParameters.get("fileid") || "",
  );
  const [tex, setTex] = useState<string>("");
  const [pdf, setPdf] = useState<string>("");
  const [annotations, setAnnotations] = useState<TextSpan[]>([]);
  const [anchor, setAnchor] = useState<string>(
    queryParameters.get("anchor") || "",
  );

  // Login stuff
  const { token, userid, setAuth } = useAuth();
  const navigate = useNavigate();

  // Load state
  const saveid = queryParameters.get("saveid") || "";

  useEffect(() => {
    if (!token || token.length == 0) {
      navigate("/signin");
    }

    if (fileid != "") {
      loadDocument(fileid);
      console.log('loading annotations with saveid: ', saveid)
      loadAnnotations(fileid, userid, saveid);
    }

    // Wait 1 second before trying to scroll, gives the DOM time to load in.
    // Probably a better way to do this but I tried a few things and it didn't work.
    // Retry x10
    for (let i = 0; i < 10; ++i) {
      let stop = false;
      setTimeout(() => {
        if (anchor.length > 0) {
          if (!isNaN(anchor)) {
            const percent = parseFloat(anchor);
            jumpToPercent(percent);
          } else {
            jumpToElement(anchor);
          }
          setAnchor("");
        }
      }, 1000);
      if (stop) {
        break;
      }
    }
  }, []);

  const updateAnnotations = (annotations: TextSpan[]) => {
    setAnnotations(annotations);
    saveAnnotations(fileid, userid, annotations, true);
  };

  async function saveAnnotations(
    fileid: string,
    userid: string,
    annotations: TextSpan[],
    autosave: boolean = false,
  ) {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json", mode: "cors" },
      body: JSON.stringify({ annotations: annotations }),
    };
    // We handle autosaves differently
    const url = `/api/annotations?fileid=${fileid}&userid=${userid}&autosave=${autosave}`;

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

  async function loadAnnotations(
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
        console.log("Fetching: ", url)
        const response = await fetch(url, { mode: "cors" });
        res = await response.json();
	console.log('length: ', res.annotations.length)
      }
      setFileId(res["fileid"]);
      setAnnotations(res["annotations"]);
      console.log(`Loaded ${res["annotations"].length} annotations`);
      console.log(res['annotations']);
      return res["annotations"];
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDocument(fileid: string) {
    try {
      const tex_response = fetch(`/api/tex?fileid=${fileid}`, { mode: "cors" });
      const pdf_response = fetch(`/api/pdf?fileid=${fileid}`, { mode: "cors" });
      const tex_res = await (await tex_response).json();
      setTex(tex_res["tex"]);
      setFileId(tex_res["fileid"]);
      const pdf_res = await (await pdf_response).json();
      setPdf(pdf_res["pdf"]);
      setQueryParameters({ fileid: fileid});
    } catch (e) {
      console.error(e);
      setQueryParameters({ fileid: "", timestamp: "" });
    }
  }

  return (
    <div>
      <TopBar
        loadDocument={loadDocument}
        loadAnnotations={loadAnnotations}
        saveAnnotations={async () => {
          return await saveAnnotations(fileid, userid, annotations, false);
        }}
        userid={userid}
        fileid={fileid}
      />
      <div
        style={{
          display: "flex",
          alignContent: "center",
          width: "98vw",
          margin: "10px",
        }}
      >
        <div
          id="scroll-box"
          style={{
            flexGrow: 1,
            resize: "horizontal",
            overflow: "scroll",
            width: "49vw",
            height: "90vh",
          }}
        >
          <Annotater
            style={{
              paddingBottom: "8px",
              lineHeight: 3,
              margin: "10px",
            }}
            fileid={fileid}
            saveid={saveid}
            colors={colors}
            labels={labels}
            content={tex}
            annotations={annotations}
            onAddAnnotation={(annos) => updateAnnotations(annos)}
            getSpan={(span: TextSpan) => ({ ...span })}
          />
        </div>
        <div style={{ flexGrow: 3 }}>
          <PDFViewer data={pdf} />
        </div>
      </div>
    </div>
  );
};

export default AnnotationTool;
