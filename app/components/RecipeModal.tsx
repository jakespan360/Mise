'use client'

import { useEffect, useState } from 'react'
import { Recipe, RecipeIngredient } from '@/lib/supabase'

type Props = {
  recipe: Recipe & { ingredients: RecipeIngredient[] }
  onClose: () => void
  onUpdate: (updated: Recipe & { ingredients: RecipeIngredient[] }) => void
}

const UNIT_TYPES = ['count', 'weight', 'volume', 'bulk'] as const

type DraftIngredient = {
  canonical_name: string
  quantity: string
  unit: string
  unit_type: typeof UNIT_TYPES[number]
}

const EMPTY_DRAFT: DraftIngredient = { canonical_name: '', quantity: '', unit: 'whole', unit_type: 'count' }

export default function RecipeModal({ recipe, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe.ingredients)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<DraftIngredient>(EMPTY_DRAFT)
  const [newDraft, setNewDraft] = useState<DraftIngredient>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (editingId) { setEditingId(null); return }
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, editingId])

  function startEdit(ing: RecipeIngredient) {
    setEditingId(ing.id)
    setEditDraft({
      canonical_name: ing.canonical_name,
      quantity: String(ing.quantity),
      unit: ing.unit,
      unit_type: ing.unit_type,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/recipe-ingredients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canonical_name: editDraft.canonical_name,
        quantity: parseFloat(editDraft.quantity),
        unit: editDraft.unit,
        unit_type: editDraft.unit_type,
      }),
    })
    if (res.ok) {
      const updated: RecipeIngredient = await res.json()
      const next = ingredients.map(i => i.id === id ? updated : i)
      setIngredients(next)
      onUpdate({ ...recipe, ingredients: next })
      setEditingId(null)
    }
    setSaving(false)
  }

  async function deleteIngredient(id: string) {
    const res = await fetch(`/api/recipe-ingredients/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const next = ingredients.filter(i => i.id !== id)
      setIngredients(next)
      onUpdate({ ...recipe, ingredients: next })
    }
  }

  async function addIngredient() {
    if (!newDraft.canonical_name.trim() || !newDraft.quantity) return
    setSaving(true)
    const res = await fetch(`/api/recipes/${recipe.id}/ingredients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canonical_name: newDraft.canonical_name.trim().toLowerCase(),
        quantity: parseFloat(newDraft.quantity),
        unit: newDraft.unit,
        unit_type: newDraft.unit_type,
      }),
    })
    if (res.ok) {
      const added: RecipeIngredient = await res.json()
      const next = [...ingredients, added]
      setIngredients(next)
      onUpdate({ ...recipe, ingredients: next })
      setNewDraft(EMPTY_DRAFT)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-stone-100">
          <div>
            <h2 className="text-lg font-semibold text-stone-800">{recipe.title}</h2>
            {recipe.source_url && (
              <a
                href={recipe.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-stone-400 hover:text-stone-600 mt-0.5 inline-block"
              >
                {recipe.source_url} ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setEditing(e => !e); setEditingId(null) }}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                editing
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'text-stone-500 border-stone-200 hover:border-stone-400 hover:text-stone-700'
              }`}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Ingredients */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
              Ingredients ({ingredients.length})
            </p>
            <ul className="divide-y divide-stone-100">
              {ingredients.map(ing => (
                <li key={ing.id} className="py-2.5">
                  {editing && editingId === ing.id ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editDraft.canonical_name}
                          onChange={e => setEditDraft(d => ({ ...d, canonical_name: e.target.value }))}
                          className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                          placeholder="Ingredient name"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editDraft.quantity}
                          onChange={e => setEditDraft(d => ({ ...d, quantity: e.target.value }))}
                          className="w-20 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                          placeholder="Qty"
                          min="0"
                          step="0.25"
                        />
                        <input
                          type="text"
                          value={editDraft.unit}
                          onChange={e => setEditDraft(d => ({ ...d, unit: e.target.value }))}
                          className="w-20 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                          placeholder="Unit"
                        />
                        <select
                          value={editDraft.unit_type}
                          onChange={e => setEditDraft(d => ({ ...d, unit_type: e.target.value as typeof UNIT_TYPES[number] }))}
                          className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                        >
                          {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(ing.id)}
                          disabled={saving}
                          className="text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-50 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-stone-500 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="text-sm text-stone-800 capitalize">{ing.canonical_name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm text-stone-400 tabular-nums">
                          {ing.unit_type === 'count' ? Math.ceil(ing.quantity) : ing.quantity} {ing.unit}
                        </span>
                        {editing && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEdit(ing)}
                              className="text-xs text-stone-400 hover:text-stone-700 border border-stone-200 px-2 py-0.5 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteIngredient(ing.id)}
                              className="text-xs text-stone-400 hover:text-red-500 border border-stone-200 px-2 py-0.5 rounded transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Add ingredient form — only in edit mode */}
          {editing && (
            <div className="border-t border-stone-100 pt-4 space-y-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Add ingredient</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDraft.canonical_name}
                  onChange={e => setNewDraft(d => ({ ...d, canonical_name: e.target.value }))}
                  placeholder="Ingredient name"
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newDraft.quantity}
                  onChange={e => setNewDraft(d => ({ ...d, quantity: e.target.value }))}
                  placeholder="Qty"
                  min="0"
                  step="0.25"
                  className="w-20 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
                <input
                  type="text"
                  value={newDraft.unit}
                  onChange={e => setNewDraft(d => ({ ...d, unit: e.target.value }))}
                  placeholder="Unit"
                  className="w-20 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
                <select
                  value={newDraft.unit_type}
                  onChange={e => setNewDraft(d => ({ ...d, unit_type: e.target.value as typeof UNIT_TYPES[number] }))}
                  className="border border-stone-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
                >
                  {UNIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button
                  onClick={addIngredient}
                  disabled={saving || !newDraft.canonical_name.trim() || !newDraft.quantity}
                  className="text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Source text */}
          {recipe.source_text && !editing && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">Original text</p>
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{recipe.source_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
