// MIT License
// Copyright (c) 2026 Angshuman Nandy

const jwt = require('jsonwebtoken')

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided.' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' })
  }
}

module.exports = verifyJWT
