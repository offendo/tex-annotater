"use client"
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import SignIn from "@/app/pages/SignIn"
import SignUp from "@/app/pages/SignUp"
import AnnotationTool from "@/app/pages/AnnotationTool"
import "@/app/style/globals.css"

export default function App() {
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/" element={<AnnotationTool />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signup" element={<SignUp />} />
                </Routes>
            </div>
        </Router>
    );
}
