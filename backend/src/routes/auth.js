const express = require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const db = require('../db/sqlite')

const router = express.Router()

router.post('/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const userId = uuidv4()

  db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(userId, email, passwordHash)

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.status(201).json({ token, user: { id: userId, email } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' })
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid email or password.' })
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

module.exports = router
