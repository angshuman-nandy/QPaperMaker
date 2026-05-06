// MIT License
// Copyright (c) 2026 Angshuman Nandy

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import GeneratePaper from './pages/GeneratePaper'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/upload" element={
          <PrivateRoute><Upload /></PrivateRoute>
        } />
        <Route path="/upload/:bookId" element={
          <PrivateRoute><Upload /></PrivateRoute>
        } />
        <Route path="/generate/:bookId" element={
          <PrivateRoute><GeneratePaper /></PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
