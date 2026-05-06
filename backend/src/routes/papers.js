// MIT License
// Copyright (c) 2026 Angshuman Nandy

const express = require('express')
const path = require('path')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/sqlite')
const aiClient = require('../services/aiClient')

const router = express.Router()

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../local_data')

// List all papers for the current user
router.get('/', (req, res) => {
  const papers = db.prepare(
    'SELECT * FROM papers WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.userId)

  const parsed = papers.map((p) => ({
    ...p,
    sections_json: undefined,
    sections: p.sections_json ? JSON.parse(p.sections_json) : [],
  }))
  res.json(parsed)
})

// Get paper status
router.get('/:id/status', (req, res) => {
  const paper = db.prepare('SELECT id, status, error_msg FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!paper) return res.status(404).json({ message: 'Paper not found.' })
  res.json(paper)
})

// Download the question paper PDF
router.get('/:id/download', (req, res) => {
  const paper = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!paper) return res.status(404).json({ message: 'Paper not found.' })
  if (paper.status !== 'ready') return res.status(400).json({ message: 'Paper is not ready yet.' })
  if (!paper.file_path || !fs.existsSync(paper.file_path)) {
    return res.status(404).json({ message: 'PDF file not found.' })
  }
  res.download(paper.file_path, `${paper.title}.pdf`)
})

// Download the answer key PDF
router.get('/:id/download-key', (req, res) => {
  const paper = db.prepare('SELECT * FROM papers WHERE id = ? AND user_id = ?').get(req.params.id, req.userId)
  if (!paper) return res.status(404).json({ message: 'Paper not found.' })
  if (!paper.key_file_path || !fs.existsSync(paper.key_file_path)) {
    return res.status(404).json({ message: 'Answer key not found.' })
  }
  res.download(paper.key_file_path, `${paper.title} — Answer Key.pdf`)
})

// Start generating a paper
router.post('/generate', async (req, res) => {
  const { book_id, title, ...params } = req.body

  if (!book_id || !title) {
    return res.status(400).json({ message: 'book_id and title are required.' })
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ? AND user_id = ?').get(book_id, req.userId)
  if (!book) return res.status(404).json({ message: 'Book not found.' })
  if (book.status !== 'ready') return res.status(400).json({ message: 'Book is still processing.' })

  const paperId = uuidv4()
  const papersDir = path.join(DATA_DIR, 'papers')
  fs.mkdirSync(papersDir, { recursive: true })

  db.prepare(
    'INSERT INTO papers (id, user_id, book_id, title, params_json, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(paperId, req.userId, book_id, title, JSON.stringify(params), 'generating')

  res.status(202).json({ id: paperId, status: 'generating' })

  // Generate in the background
  generatePaper(paperId, book_id, title, params, papersDir).catch(() => {
    db.prepare("UPDATE papers SET status = 'error', error_msg = ? WHERE id = ?").run(
      'Failed to generate paper.',
      paperId
    )
  })
})

async function generatePaper(paperId, bookId, title, params, papersDir) {
  const filePath = path.join(papersDir, `${paperId}.pdf`)
  const keyFilePath = path.join(papersDir, `${paperId}_key.pdf`)

  const result = await aiClient.post('/generate', {
    paper_id: paperId,
    book_id: bookId,
    title,
    params,
    output_path: filePath,
    key_output_path: keyFilePath,
  })

  db.prepare(
    "UPDATE papers SET status = 'ready', file_path = ?, key_file_path = ?, sections_json = ? WHERE id = ?"
  ).run(
    result.data.file_path,
    result.data.key_file_path || null,
    JSON.stringify(result.data.sections || []),
    paperId
  )
}

module.exports = router
