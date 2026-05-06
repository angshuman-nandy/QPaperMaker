// MIT License
// Copyright (c) 2026 Angshuman Nandy

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { createProxyMiddleware } = require('http-proxy-middleware')

const verifyJWT = require('./middleware/auth')
const authRoutes = require('./routes/auth')
const booksRoutes = require('./routes/books')
const papersRoutes = require('./routes/papers')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

// Proxy /ai/* to the Python FastAPI service
app.use('/ai', createProxyMiddleware({
  target: process.env.AI_PIPELINE_URL || 'http://localhost:8000',
  changeOrigin: true,
}))

// Public routes
app.use('/api/auth', authRoutes)

// Protected routes — all require a valid JWT
app.use('/api/books',  verifyJWT, booksRoutes)
app.use('/api/papers', verifyJWT, papersRoutes)

// Serve the React build in production
const distPath = path.join(__dirname, '../../frontend/dist')
app.use(express.static(distPath))
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
})
