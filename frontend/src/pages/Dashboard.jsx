import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

function StatusBadge({ status }) {
  const styles = {
    processing: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    generating: 'bg-yellow-100 text-yellow-800',
  }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function BookProgress({ progress }) {
  if (!progress) return null
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
  const label = progress.current_file === 'Storing in vector database...'
    ? 'Storing in vector database…'
    : progress.current_file
    ? `Reading: ${progress.current_file}`
    : 'Starting…'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span className="truncate pr-2">{label}</span>
        <span className="tabular-nums flex-shrink-0">{progress.done}/{progress.total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BookCard({ book, onDelete }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/upload/${book.id}`)}
      className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{book.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {book.page_count > 0 ? `${book.page_count} ${book.page_count === 1 ? 'page' : 'pages'} · ` : ''}
            {new Date(book.created_at).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={book.status} />
      </div>

      {book.status === 'processing' && book.progress && (
        <BookProgress progress={book.progress} />
      )}

      <div className="flex gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
        {book.status === 'ready' && (
          <Link
            to={`/generate/${book.id}`}
            className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 rounded-lg transition-colors"
          >
            Generate Paper
          </Link>
        )}
        <button
          onClick={() => onDelete(book.id)}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

async function downloadFile(endpoint, filename) {
  try {
    const res = await api.get(endpoint, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert('Download failed. Please try again.')
  }
}

const PREVIEW_LIMIT = 3

function QuestionPreview({ sections }) {
  if (!sections || sections.length === 0) return null

  // Collect first PREVIEW_LIMIT questions with their section title
  const preview = []
  let total = 0
  for (const section of sections) {
    total += section.questions?.length ?? 0
    for (const q of section.questions ?? []) {
      if (preview.length < PREVIEW_LIMIT) preview.push({ section: section.title, q })
    }
  }
  const remaining = total - preview.length

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Preview</p>
      <div className="space-y-3">
        {preview.map(({ section, q }, i) => (
          <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            {i === 0 || preview[i - 1].section !== section ? (
              <p className="text-xs font-medium text-blue-600 truncate">{section}</p>
            ) : null}
            <p className="text-sm text-gray-800">
              <span className="text-gray-400 mr-1.5">Q{q.number}.</span>
              {q.text}
            </p>
            {q.options?.length > 0 && (
              <ul className="space-y-0.5 pl-2">
                {q.options.map((opt, j) => (
                  <li key={j} className="text-xs text-gray-500">{opt}</li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-400">{q.marks} mark{q.marks !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          + {remaining} more question{remaining !== 1 ? 's' : ''} — download to see full paper
        </p>
      )}
    </div>
  )
}

function PaperDetailModal({ paper, onClose }) {
  if (!paper) return null

  let params = {}
  try { params = JSON.parse(paper.params_json) } catch { /* ignore */ }

  const { difficulty = {}, question_types = {}, total_marks, time_minutes, topic_focus = [], include_answer_key } = params
  const enabledTypes = Object.entries(question_types).filter(([, v]) => v?.enabled)

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-lg">{paper.title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{new Date(paper.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={paper.status} />
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {paper.status === 'error' && paper.error_msg && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {paper.error_msg}
            </p>
          )}

          {/* Overview */}
          {(total_marks || time_minutes) && (
            <div className="flex gap-4">
              {total_marks && (
                <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{total_marks}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Total Marks</p>
                </div>
              )}
              {time_minutes && (
                <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{time_minutes}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Minutes</p>
                </div>
              )}
            </div>
          )}

          {/* Difficulty */}
          {(difficulty.easy_pct || difficulty.medium_pct || difficulty.hard_pct) && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Difficulty</p>
              <div className="flex gap-2">
                {[['Easy', difficulty.easy_pct, 'bg-green-100 text-green-700'],
                  ['Medium', difficulty.medium_pct, 'bg-yellow-100 text-yellow-700'],
                  ['Hard', difficulty.hard_pct, 'bg-red-100 text-red-700']].map(([label, pct, cls]) =>
                  pct ? (
                    <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${cls}`}>
                      {label} {pct}%
                    </span>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Question types */}
          {enabledTypes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Questions</p>
              <div className="space-y-1.5">
                {enabledTypes.map(([type, config]) => (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 capitalize">{type.replace(/_/g, ' ')}</span>
                    <span className="text-gray-500 tabular-nums">
                      {config.count} × {config.marks_each} mark{config.marks_each !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topic focus */}
          {topic_focus.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Topic Focus</p>
              <div className="flex flex-wrap gap-1.5">
                {topic_focus.map((t) => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {include_answer_key !== undefined && (
            <p className="text-sm text-gray-500">
              Answer key: <span className="text-gray-700 font-medium">{include_answer_key ? 'Yes' : 'No'}</span>
            </p>
          )}

          {/* Question preview */}
          <QuestionPreview sections={paper.sections} />

          {/* Downloads */}
          {paper.status === 'ready' && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => downloadFile(`/papers/${paper.id}/download`, `${paper.title}.pdf`)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
              >
                Download PDF
              </button>
              {paper.key_file_path && (
                <button
                  onClick={() => downloadFile(`/papers/${paper.id}/download-key`, `${paper.title} — Answer Key.pdf`)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                >
                  Answer Key
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PaperCard({ paper, onSelect }) {
  let params = {}
  try { params = JSON.parse(paper.params_json) } catch { /* ignore */ }
  const enabledCount = Object.values(params.question_types || {}).filter((v) => v?.enabled).length

  return (
    <div
      onClick={() => onSelect(paper)}
      className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{paper.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date(paper.created_at).toLocaleDateString()}
            {params.total_marks ? ` · ${params.total_marks} marks` : ''}
            {enabledCount > 0 ? ` · ${enabledCount} type${enabledCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <StatusBadge status={paper.status} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [books, setBooks] = useState([])
  const [papers, setPapers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPaper, setSelectedPaper] = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const hasProcessing = books.some((b) => b.status === 'processing' || b.status === 'generating')
    if (!hasProcessing) return
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [books])

  async function loadData() {
    try {
      const [booksRes, papersRes] = await Promise.all([
        api.get('/books'),
        api.get('/papers'),
      ])
      setBooks(booksRes.data)
      setPapers(papersRes.data)
    } catch {
      // 401 handled by axios interceptor
    } finally {
      setLoading(false)
    }
  }

  async function deleteBook(bookId) {
    if (!confirm('Delete this book and all its data?')) return
    try {
      await api.delete(`/books/${bookId}`)
      setBooks((prev) => prev.filter((b) => b.id !== bookId))
    } catch {
      alert('Failed to delete book. Please try again.')
    }
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">AI QPaperMaker</h1>
        <div className="flex items-center gap-3">
          <Link
            to="/upload"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Upload Book
          </Link>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Books</h2>
          {books.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
              <p className="text-gray-500 mb-4">No books uploaded yet.</p>
              <Link
                to="/upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                Upload your first book
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={deleteBook} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Papers</h2>
          {papers.length === 0 ? (
            <p className="text-gray-500 text-sm">No papers generated yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((paper) => (
                <PaperCard key={paper.id} paper={paper} onSelect={setSelectedPaper} />
              ))}
            </div>
          )}
        </section>
      </main>

      <PaperDetailModal paper={selectedPaper} onClose={() => setSelectedPaper(null)} />
    </div>
  )
}
