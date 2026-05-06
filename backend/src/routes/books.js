// MIT License
// Copyright (c) 2026 Angshuman Nandy

const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/sqlite')
const aiClient = require('../services/aiClient')

const router = express.Router()

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../local_data')
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bookDir = path.join(UPLOADS_DIR, req.bookId)
    fs.mkdirSync(bookDir, { recursive: true })
    cb(null, bookDir)
  },
  filename: (req, file, cb) => cb(null, file.originalname),
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are accepted.'))
  },
})

function assignBookId(req, res, next) {
  req.bookId = uuidv4()
  next()
}

function setProgress(bookId, done, total, currentFile, parallel = false) {
  db.prepare('UPDATE books SET progress_json = ? WHERE id = ?').run(
    JSON.stringify({ done, total, current_file: currentFile, parallel }),
    bookId
  )
}

function addLog(bookId, level, msg) {
  const row = db.prepare('SELECT logs_json FROM books WHERE id = ?').get(bookId)
  const logs = row?.logs_json ? JSON.parse(row.logs_json) : []
  logs.push({ t: new Date().toISOString(), level, msg })
  db.prepare('UPDATE books SET logs_json = ? WHERE id = ?').run(JSON.stringify(logs), bookId)
}

// List all books for the current user
router.get('/', (req, res) => {
  const books = db.prepare(
    'SELECT * FROM books WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId)

  const parsed = books.map((b) => ({
    ...b,
    progress_json: undefined,
    logs_json: undefined,
    progress: b.progress_json ? JSON.parse(b.progress_json) : null,
  }))
  res.json(parsed)
})

// Get book processing status, progress and logs
router.get('/:id/status', (req, res) => {
  const book = db.prepare(
    'SELECT id, title, status, page_count, error_msg, progress_json, logs_json FROM books WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId)
  if (!book) return res.status(404).json({ message: 'Book not found.' })

  const progress = book.progress_json ? JSON.parse(book.progress_json) : null
  const logs = book.logs_json ? JSON.parse(book.logs_json) : []
  res.json({ ...book, progress_json: undefined, logs_json: undefined, progress, logs })
})

// Upload new book images
router.post('/upload', assignBookId, upload.array('images'), async (req, res) => {
  const { title } = req.body
  const files = req.files

  if (!title) return res.status(400).json({ message: 'Title is required.' })
  if (!files || files.length === 0) return res.status(400).json({ message: 'At least one image is required.' })

  const bookId = req.bookId

  db.prepare(
    'INSERT INTO books (id, user_id, title, page_count, status, progress_json, logs_json) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    bookId, req.userId, title, files.length, 'processing',
    JSON.stringify({ done: 0, total: files.length, current_file: null, parallel: true }),
    JSON.stringify([{ t: new Date().toISOString(), level: 'info', msg: `Upload received — ${files.length} page(s) queued` }])
  )

  res.status(202).json({ id: bookId, status: 'processing' })

  processBook(bookId, files).catch((err) => {
    addLog(bookId, 'error', `Fatal error: ${err.message}`)
    db.prepare("UPDATE books SET status = 'error', error_msg = ?, progress_json = NULL WHERE id = ?").run(
      err.message || 'Failed to process images.',
      bookId
    )
  })
})

async function processBook(bookId, files) {
  addLog(bookId, 'info', `Starting OCR on ${files.length} page(s) in parallel`)
  setProgress(bookId, 0, files.length, `Processing ${files.length} page(s) with AI…`, true)

  const images = files.map((file) => ({
    filename: file.originalname,
    data: fs.readFileSync(file.path).toString('base64'),
    mimetype: file.mimetype,
  }))

  let pages
  try {
    const ocrRes = await aiClient.post('/ocr', { images })
    pages = ocrRes.data.pages
    addLog(bookId, 'info', `OCR complete — extracted text from ${pages.length} page(s)`)
  } catch (err) {
    addLog(bookId, 'error', `OCR failed: ${err.response?.data?.detail || err.message}`)
    throw err
  }

  setProgress(bookId, files.length, files.length, 'Storing in vector database...')
  addLog(bookId, 'info', 'Ingesting pages into vector database…')

  try {
    await aiClient.post('/ingest', { book_id: bookId, pages })
    addLog(bookId, 'info', 'Ingestion complete — book is ready')
  } catch (err) {
    addLog(bookId, 'error', `Ingestion failed: ${err.response?.data?.detail || err.message}`)
    throw err
  }

  db.prepare("UPDATE books SET status = 'ready', page_count = ?, progress_json = NULL WHERE id = ?").run(
    pages.length, bookId
  )
}

// Delete a book and its uploaded files + ChromaDB collection
router.delete('/:id', async (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!book) return res.status(404).json({ message: 'Book not found.' })

  try {
    await aiClient.delete(`/books/${book.id}`)
  } catch {
    // Non-fatal
  }

  const bookDir = path.join(UPLOADS_DIR, book.id)
  if (fs.existsSync(bookDir)) fs.rmSync(bookDir, { recursive: true })

  db.prepare('DELETE FROM papers WHERE book_id = ?').run(book.id)
  db.prepare('DELETE FROM books WHERE id = ?').run(book.id)

  res.json({ message: 'Book deleted.' })
})

module.exports = router
