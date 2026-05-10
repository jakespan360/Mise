'use client'

import { useEffect } from 'react'
import { Recipe, RecipeIngredient } from '@/lib/supabase'

type Props = {
  recipe: Recipe & { ingredients: RecipeIngredient[] }
  onClose: () => void
}

export default function RecipeModal({ recipe, onClose }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

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
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 transition-colors shrink-0 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Ingredients */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div>
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
              Ingredients ({recipe.ingredients.length})
            </p>
            <ul className="divide-y divide-stone-100">
              {recipe.ingredients.map(ing => (
                <li key={ing.id} className="py-2.5 flex items-baseline justify-between gap-4">
                  <span className="text-sm text-stone-800 capitalize">{ing.canonical_name}</span>
                  <span className="text-sm text-stone-400 shrink-0 tabular-nums">
                    {ing.unit_type === 'count' ? Math.ceil(ing.quantity) : ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {recipe.source_text && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                Original text
              </p>
              <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
                {recipe.source_text}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
