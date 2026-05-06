// MIT License
// Copyright (c) 2026 Angshuman Nandy

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../../local_data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(path.join(DATA_DIR, 'db.sqlite'))

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id),
    title         TEXT NOT NULL,
    page_count    INTEGER DEFAULT 0,
    status        TEXT DEFAULT 'processing',
    error_msg     TEXT,
    progress_json TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS papers (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id),
    book_id       TEXT NOT NULL REFERENCES books(id),
    title         TEXT NOT NULL,
    params_json   TEXT NOT NULL,
    status        TEXT DEFAULT 'generating',
    file_path     TEXT,
    key_file_path TEXT,
    error_msg     TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Migrations for columns added after initial release
try { db.exec('ALTER TABLE books ADD COLUMN progress_json TEXT') } catch { /* already exists */ }
try { db.exec('ALTER TABLE books ADD COLUMN logs_json TEXT') } catch { /* already exists */ }
try { db.exec('ALTER TABLE papers ADD COLUMN sections_json TEXT') } catch { /* already exists */ }

module.exports = db
