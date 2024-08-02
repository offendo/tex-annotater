
import * as React from "react";
import * as ReactDOM from "react-dom/client";

import SignIn from "@/pages/SignIn"
import SignUp from "@/pages/SignUp"
import AnnotationTool from "@/pages/AnnotationTool"
import ComparisonTool from "@/pages/ComparisonTool"

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import "@/style/globals.css"
import "@/style/style.css"
import App from "./App";


const router = createBrowserRouter([
  {
    path: "/",
    element: <AnnotationTool />,
  },
  {
    path: "/comparison",
    element: <ComparisonTool />,
  },
  {
    path: "/signin",
    element: <SignIn />,
  },
  {
    path: "/signup",
    element: <SignUp />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
