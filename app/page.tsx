'use client'

import { useState } from 'react'
import Link from 'next/link'
import Toast from './components/Toast'
import { Recipe } from '@/lib/supabase'

type ParsedResult = Recipe & { ingredients: { canonical_name: string; quantity: number; unit: string; unit_type: string; original_text: string | null }[] }

export default function Home() {
  const [mode, setMode] = useState<'text' | 'url'>('text')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedResult | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    setError(null)
    setParsed(null)

    try {
      const res = await fetch('/api/recipes/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), type: mode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      setParsed(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setParsed(null)
    setInput('')
    setError(null)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-800 mb-1">Add a Recipe</h1>
        <p className="text-stone-500 text-sm">Paste recipe text or a URL to parse ingredients automatically.</p>
      </div>

      {!parsed ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-1 p-1 bg-stone-100 rounded-lg w-fit">
            {(['text', 'url'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setInput('') }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {m === 'text' ? 'Paste text' : 'Enter URL'}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Paste your recipe here..."
              rows={10}
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-y bg-white"
            />
          ) : (
            <input
              type="url"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://..."
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
            />
          )}

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-stone-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Parsing...' : 'Parse Recipe'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-stone-800">{parsed.title}</h2>
                <p className="text-stone-400 text-sm mt-1">{parsed.ingredients.length} ingredients parsed</p>
              </div>
              {parsed.source_url && (
                <a href={parsed.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-400 hover:text-stone-600 shrink-0">
                  Source ↗
                </a>
              )}
            </div>

            <ul className="divide-y divide-stone-100">
              {parsed.ingredients.map((ing, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-4">
                  <span className="text-sm text-stone-700 capitalize">{ing.canonical_name}</span>
                  <span className="text-sm text-stone-400 shrink-0">
                    {ing.unit_type === 'count' ? Math.ceil(ing.quantity) : ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <Link
              href="/recipes"
              onClick={() => setToast(`"${parsed.title}" saved`)}
              className="bg-stone-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              View saved recipes
            </Link>
            <button
              onClick={handleReset}
              className="border border-stone-200 text-stone-600 px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              Add another
            </button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
