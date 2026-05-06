// MIT License
// Copyright (c) 2026 Angshuman Nandy

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import api from '../api/client'

function LogsPanel({ logs }) {
  const [open, setOpen] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, open])

  if (logs.length === 0) return null

  return (
    <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 transition-colors"
      >
        <span className="font-medium">Logs ({logs.length})</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-gray-900 px-4 py-3 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 flex-shrink-0">
                {new Date(log.t).toLocaleTimeString()}
              </span>
              <span className={log.level === 'error' ? 'text-red-400' : 'text-gray-300'}>
                {log.msg}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function ProgressView({ bookId }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState(null)
  const [status, setStatus] = useState('processing')
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await api.get(`/books/${bookId}/status`)
        if (cancelled) return
        setStatus(res.data.status)
        if (res.data.title) setTitle(res.data.title)
        if (res.data.progress) setProgress(res.data.progress)
        if (res.data.logs) setLogs(res.data.logs)
        if (res.data.status === 'error') setError(res.data.error_msg || 'Processing failed.')
      } catch {
        if (!cancelled) setError('Lost connection while processing.')
      }
    }

    poll()
    const interval = setInterval(poll, 2000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [bookId])

  // Stop polling once terminal state reached
  useEffect(() => {
    // polling useEffect already checks status — nothing extra needed
  }, [status])

  const total = progress?.total ?? 0
  const done = progress?.done ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isParallel = progress?.parallel === true
  const isIngesting = progress?.current_file === 'Storing in vector database...'

  if (status === 'ready') {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Book ready!</h2>
        {title && <p className="text-gray-500 text-sm">"{title}" has been processed and is ready to use.</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(`/generate/${bookId}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Generate Paper
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-800 text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
        <LogsPanel logs={logs} />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
          {error}
        </p>
        <div className="flex justify-center">
          <button onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-700">
            Back to Dashboard
          </button>
        </div>
        <LogsPanel logs={logs} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-1.5">
          <span>
            {isIngesting
              ? 'Storing in vector database…'
              : isParallel && total > 0
              ? `Running OCR on ${total} page(s) in parallel…`
              : progress?.current_file
              ? `Reading: ${progress.current_file}`
              : 'Starting…'}
          </span>
          <span className="tabular-nums">{done} / {total}</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-500"
            style={{ width: isParallel && !isIngesting ? '100%' : `${pct}%`,
                     opacity: isParallel && !isIngesting ? undefined : 1 }}
          />
        </div>
        {isParallel && !isIngesting && (
          <p className="text-xs text-gray-400 mt-1">All pages processing simultaneously — results arrive together</p>
        )}
      </div>

      {/* Per-page tiles */}
      {total > 0 && (
        <div className="space-y-2">
          {Array.from({ length: total }).map((_, i) => {
            const pageDone = isIngesting || i < done
            const pageActive = !isIngesting && (isParallel ? true : i === done && status === 'processing')
            return (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                  pageDone
                    ? 'bg-green-100 text-green-600'
                    : pageActive
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {pageDone ? (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${pageActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                  )}
                </span>
                <span className={pageDone ? 'text-gray-500 line-through' : pageActive ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  Page {i + 1}
                </span>
              </div>
            )
          })}
        </div>
      )}

      <LogsPanel logs={logs} />
    </div>
  )
}

export default function Upload() {
  const navigate = useNavigate()
  const { bookId: urlBookId } = useParams()
  const fileInputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // If URL already has a bookId, go straight to progress view
  if (urlBookId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
          <h1 className="text-lg font-bold text-gray-900">Upload Progress</h1>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-10">
          <div className="bg-white border border-gray-200 rounded-xl p-8">
            <p className="text-sm text-gray-500 mb-6">Extracting text from each page using AI…</p>
            <ProgressView bookId={urlBookId} />
          </div>
        </main>
      </div>
    )
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files)
    const images = selected.filter((f) => f.type.startsWith('image/'))
    setError(images.length !== selected.length ? 'Only image files (JPG, PNG, etc.) are accepted.' : '')
    setFiles(images)
  }

  function handleDrop(e) {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files)
    const images = dropped.filter((f) => f.type.startsWith('image/'))
    setFiles(images)
    setError(images.length !== dropped.length ? 'Some files were skipped — only image files are accepted.' : '')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (files.length === 0) return setError('Please select at least one image.')
    if (!title.trim()) return setError('Please enter a title for this book.')

    setError('')
    setUploading(true)

    const formData = new FormData()
    formData.append('title', title.trim())
    files.forEach((f) => formData.append('images', f))

    try {
      const res = await api.post('/books/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      navigate(`/upload/${res.data.id}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Upload Book</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-gray-500 text-sm mb-8">
          Upload photos of textbook pages. The app will extract the text and prepare it for question generation.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology Chapter 5 — Cell Division"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page Images</label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current.click()}
              className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
            >
              {files.length > 0 ? (
                <p className="text-sm text-gray-700 font-medium">
                  {files.length} image{files.length > 1 ? 's' : ''} selected
                </p>
              ) : (
                <>
                  <p className="text-gray-500 text-sm">Drag & drop images here, or click to browse</p>
                  <p className="text-gray-400 text-xs mt-1">JPG, PNG, WEBP accepted</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {files.length > 0 && (
            <ul className="text-sm text-gray-600 space-y-1 border border-gray-100 rounded-lg p-3 bg-white">
              {files.map((f, i) => (
                <li key={i} className="flex justify-between">
                  <span>{f.name}</span>
                  <span className="text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {uploading ? 'Uploading…' : 'Upload & Process'}
          </button>
        </form>
      </main>
    </div>
  )
}
