// MIT License
// Copyright (c) 2026 Angshuman Nandy

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'

const QUESTION_TYPES = [
  { key: 'mcq',          label: 'Multiple Choice (MCQ)',  defaultCount: 10, defaultMarks: 1 },
  { key: 'true_false',   label: 'True / False',           defaultCount: 5,  defaultMarks: 1 },
  { key: 'fill_blanks',  label: 'Fill in the Blanks',     defaultCount: 5,  defaultMarks: 1 },
  { key: 'short_answer', label: 'Short Answer',           defaultCount: 5,  defaultMarks: 3 },
  { key: 'long_answer',  label: 'Long Answer',            defaultCount: 2,  defaultMarks: 5 },
]

function buildDefaultParams() {
  const types = {}
  QUESTION_TYPES.forEach((t) => {
    types[t.key] = { enabled: true, count: t.defaultCount, marks_each: t.defaultMarks }
  })
  return {
    title: '',
    total_marks: 50,
    time_minutes: 60,
    difficulty: { easy_pct: 30, medium_pct: 50, hard_pct: 20 },
    question_types: types,
    topic_focus: '',
    include_answer_key: true,
  }
}

function NumberInput({ label, value, onChange, min = 0 }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}

export default function GeneratePaper() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [params, setParams] = useState(buildDefaultParams())
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/books').then((res) => {
      const found = res.data.find((b) => b.id === bookId)
      if (found) {
        setBook(found)
        setParams((p) => ({ ...p, title: `${found.title} — Assessment` }))
      }
    })
  }, [bookId])

  function setDifficulty(key, value) {
    setParams((p) => ({ ...p, difficulty: { ...p.difficulty, [key]: value } }))
  }

  function setQuestionType(key, field, value) {
    setParams((p) => ({
      ...p,
      question_types: {
        ...p.question_types,
        [key]: { ...p.question_types[key], [field]: value },
      },
    }))
  }

  function computedTotalMarks() {
    return QUESTION_TYPES.reduce((sum, t) => {
      const qt = params.question_types[t.key]
      if (qt.enabled) return sum + qt.count * qt.marks_each
      return sum
    }, 0)
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')

    const enabledTypes = QUESTION_TYPES.filter((t) => params.question_types[t.key].enabled)
    if (enabledTypes.length === 0) {
      setError('Please enable at least one question type.')
      return
    }

    const payload = {
      ...params,
      book_id: bookId,
      total_marks: computedTotalMarks(),
      topic_focus: params.topic_focus
        ? params.topic_focus.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    }

    setGenerating(true)
    try {
      await api.post('/papers/generate', payload)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  const totalMarks = computedTotalMarks()
  const { easy_pct, medium_pct, hard_pct } = params.difficulty
  const difficultyValid = easy_pct + medium_pct + hard_pct === 100

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">← Back</Link>
        <h1 className="text-lg font-bold text-gray-900">Generate Paper</h1>
        <span className="text-sm text-gray-400">from: {book.title}</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={handleGenerate} className="space-y-8">

          {/* Paper Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paper Title</label>
            <input
              type="text"
              required
              value={params.title}
              onChange={(e) => setParams((p) => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Paper Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Paper Settings</h2>
            <NumberInput
              label="Time allowed (minutes)"
              value={params.time_minutes}
              onChange={(v) => setParams((p) => ({ ...p, time_minutes: v }))}
              min={1}
            />
          </div>

          {/* Difficulty */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Difficulty Mix</h2>
            <p className="text-xs text-gray-400">Must add up to 100%</p>
            <NumberInput label="Easy (%)"   value={easy_pct}   onChange={(v) => setDifficulty('easy_pct', v)}   min={0} />
            <NumberInput label="Medium (%)" value={medium_pct} onChange={(v) => setDifficulty('medium_pct', v)} min={0} />
            <NumberInput label="Hard (%)"   value={hard_pct}   onChange={(v) => setDifficulty('hard_pct', v)}   min={0} />
            {!difficultyValid && (
              <p className="text-amber-600 text-xs">Currently adds up to {easy_pct + medium_pct + hard_pct}% — must be exactly 100%.</p>
            )}
          </div>

          {/* Question Types */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
            <h2 className="font-semibold text-gray-900">Question Types</h2>
            {QUESTION_TYPES.map((t) => {
              const qt = params.question_types[t.key]
              return (
                <div key={t.key} className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={qt.enabled}
                      onChange={(e) => setQuestionType(t.key, 'enabled', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{t.label}</span>
                  </label>
                  {qt.enabled && (
                    <div className="ml-6 space-y-2">
                      <NumberInput
                        label="Number of questions"
                        value={qt.count}
                        onChange={(v) => setQuestionType(t.key, 'count', v)}
                        min={1}
                      />
                      <NumberInput
                        label="Marks each"
                        value={qt.marks_each}
                        onChange={(v) => setQuestionType(t.key, 'marks_each', v)}
                        min={1}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-medium">
              <span className="text-gray-700">Total Marks</span>
              <span className="text-blue-700">{totalMarks}</span>
            </div>
          </div>

          {/* Topic Focus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic Focus <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={params.topic_focus}
              onChange={(e) => setParams((p) => ({ ...p, topic_focus: e.target.value }))}
              placeholder="e.g. photosynthesis, cell division"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated topics to focus on. Leave blank to use all content.</p>
          </div>

          {/* Answer Key */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={params.include_answer_key}
              onChange={(e) => setParams((p) => ({ ...p, include_answer_key: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Generate answer key PDF</span>
          </label>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={generating || !difficultyValid}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {generating ? 'Generating paper (this takes ~1–2 minutes)...' : `Generate Paper — ${totalMarks} marks`}
          </button>
        </form>

        {generating && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            AI agents are analyzing the content and crafting your question paper.
            You will be redirected to the dashboard when it's ready.
          </div>
        )}
      </main>
    </div>
  )
}
