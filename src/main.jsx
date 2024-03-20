
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import SignIn from "@/pages/SignIn"
import SignUp from "@/pages/SignUp"
import AnnotationTool from "@/pages/AnnotationTool"

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import "@/style/globals.css"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AnnotationTool />,
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
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);


// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
// )
