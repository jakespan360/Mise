'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Toast from '../components/Toast'
import RecipeModal from '../components/RecipeModal'
import { Recipe, RecipeIngredient } from '@/lib/supabase'

type RecipeWithIngredients = Recipe & { ingredients: RecipeIngredient[] }

export default function RecipesPage() {
  const router = useRouter()
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [multipliers, setMultipliers] = useState<Record<string, number>>({})
  const [generating, setGenerating] = useState(false)
  const [viewing, setViewing] = useState<RecipeWithIngredients | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchRecipes = useCallback(async () => {
    const res = await fetch('/api/recipes')
    const data = await res.json()
    setRecipes(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        setMultipliers(m => ({ ...m, [id]: m[id] ?? 1 }))
      }
      return next
    })
  }

  function toggleAll() {
    if (selected.size === recipes.length) {
      setSelected(new Set())
    } else {
      const ids = recipes.map(r => r.id)
      setSelected(new Set(ids))
      setMultipliers(m => {
        const next = { ...m }
        ids.forEach(id => { if (!next[id]) next[id] = 1 })
        return next
      })
    }
  }

  function setMultiplier(id: string, delta: number) {
    setMultipliers(prev => ({ ...prev, [id]: Math.max(1, (prev[id] ?? 1) + delta) }))
  }

  async function handleGenerate() {
    if (selected.size === 0) return
    setGenerating(true)
    try {
      const recipes = [...selected].map(id => ({ id, multiplier: multipliers[id] ?? 1 }))
      const res = await fetch('/api/grocery/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setToast(`Error: ${data.error}`)
        return
      }
      router.push('/grocery')
    } catch {
      setToast('Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' })
    setRecipes(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  if (loading) {
    return <div className="text-stone-400 text-sm">Loading recipes...</div>
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-stone-500">No recipes saved yet.</p>
        <Link href="/" className="text-sm text-stone-800 font-medium hover:underline">
          Add your first recipe →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800">Saved Recipes</h1>
          {recipes.length > 0 && (
            <button
              onClick={toggleAll}
              className="text-xs text-stone-400 hover:text-stone-600 mt-1 transition-colors"
            >
              {selected.size === recipes.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {selected.size > 0 && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-stone-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating
              ? 'Generating...'
              : `Generate grocery list (${selected.size} recipe${selected.size !== 1 ? 's' : ''})`}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {recipes.map(recipe => {
          const isSelected = selected.has(recipe.id)
          const multiplier = multipliers[recipe.id] ?? 1
          return (
            <div
              key={recipe.id}
              onClick={() => toggleSelect(recipe.id)}
              className={`bg-white border rounded-xl p-5 space-y-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-stone-800 ring-1 ring-stone-800'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-stone-800 border-stone-800' : 'border-stone-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-stone-800 leading-tight">{recipe.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-stone-400">{recipe.ingredients.length} ingredients</span>
                    {recipe.source_url ? (
                      <>
                        <span className="text-stone-200">·</span>
                        <a
                          href={recipe.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-stone-400 hover:text-stone-600"
                        >
                          URL ↗
                        </a>
                      </>
                    ) : (
                      <>
                        <span className="text-stone-200">·</span>
                        <span className="text-xs text-stone-400">Text</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Multiplier stepper — only visible when selected */}
              {isSelected && (
                <div
                  className="flex items-center gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-xs text-stone-500">Times making:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setMultiplier(recipe.id, -1)}
                      disabled={multiplier <= 1}
                      className="w-6 h-6 flex items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base leading-none"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-stone-800">{multiplier}</span>
                    <button
                      onClick={() => setMultiplier(recipe.id, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-stone-200 text-stone-500 hover:text-stone-800 hover:border-stone-400 transition-colors text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={e => { e.stopPropagation(); setViewing(recipe) }}
                  className="text-xs text-stone-400 border border-stone-200 px-3 py-1.5 rounded-lg hover:text-stone-700 hover:border-stone-300 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(recipe.id) }}
                  className="text-xs text-stone-400 border border-stone-200 px-3 py-1.5 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {viewing && <RecipeModal recipe={viewing} onClose={() => setViewing(null)} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
