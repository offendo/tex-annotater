// React
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Components
import SignIn from "@/pages/SignIn"
import SignUp from "@/pages/SignUp"
import AnnotationTool from "@/pages/AnnotationTool"

// Styles
import "@/style/globals.css"


export default function App() {
  console.log('running app...');
    return (
        <Router>
            <Routes>
                <Route path="/" element={<AnnotationTool />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
            </Routes>
        </Router>
    );
}
