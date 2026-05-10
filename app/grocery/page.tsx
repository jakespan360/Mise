'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { GroceryListItem, UserPreferences } from '@/lib/supabase'
import { displayQuantity } from '@/lib/units'

const UNIT_TYPES = ['count', 'weight', 'volume', 'bulk'] as const
type UnitTypeOption = typeof UNIT_TYPES[number]

const UNIT_OPTIONS: Record<string, string[]> = {
  weight: ['oz', 'g', 'lb', 'kg'],
  volume: ['cup', 'ml', 'tsp', 'tbsp', 'l'],
  count: ['whole'],
  bulk: ['pinch', 'handful', 'splash', 'tbsp', 'tsp', 'cup'],
}

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryListItem[]>([])
  const [prefs, setPrefs] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)

  const [manualName, setManualName] = useState('')
  const [manualQty, setManualQty] = useState('')
  const [manualUnit, setManualUnit] = useState('whole')
  const [manualUnitType, setManualUnitType] = useState<UnitTypeOption>('count')

  const fetchAll = useCallback(async () => {
    const [itemsRes, prefsRes] = await Promise.all([
      fetch('/api/grocery'),
      fetch('/api/preferences'),
    ])
    const [itemsData, prefsData] = await Promise.all([itemsRes.json(), prefsRes.json()])
    setItems(itemsData)
    setPrefs(prefsData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleCheck(item: GroceryListItem) {
    const updated = { ...item, checked: !item.checked }
    setItems(prev => prev.map(i => i.id === item.id ? updated : i))
    await fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: !item.checked }),
    })
  }

  async function handleAdjustQty(item: GroceryListItem, delta: number) {
    const newQty = Math.max(0, item.quantity + delta)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i))
    await fetch(`/api/grocery/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty }),
    })
  }

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/grocery/${id}`, { method: 'DELETE' })
  }

  async function handleClearChecked() {
    setItems(prev => prev.filter(i => !i.checked))
    await fetch('/api/grocery/clear-checked', { method: 'DELETE' })
  }

  async function handleClearRecipe() {
    setItems(prev => prev.filter(i => i.is_manual))
    await fetch('/api/grocery/clear-recipe', { method: 'DELETE' })
  }

  async function handleAddManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualName.trim() || !manualQty) return

    const res = await fetch('/api/grocery/add-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        canonical_name: manualName.trim().toLowerCase(),
        quantity: parseFloat(manualQty),
        unit: manualUnit,
        unit_type: manualUnitType,
      }),
    })
    if (res.ok) {
      const newItem = await res.json()
      setItems(prev => [...prev, newItem])
      setManualName('')
      setManualQty('')
    }
  }

  async function handlePrefChange(key: 'weight_unit' | 'volume_unit', value: string) {
    setPrefs(prev => prev ? { ...prev, [key]: value } : prev)
    await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
  }

  const CATEGORY_ORDER = [
    'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Deli',
    'Bakery', 'Canned & Dry', 'Frozen', 'Pantry', 'Beverages', 'Other',
  ]

  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  const uncheckedByCategory = CATEGORY_ORDER.reduce<Record<string, GroceryListItem[]>>((acc, cat) => {
    const group = unchecked.filter(i => (i.category ?? 'Other') === cat)
    if (group.length > 0) acc[cat] = group
    return acc
  }, {})

  function getStepForItem(item: GroceryListItem): number {
    if (item.unit_type === 'count') return 1
    if (item.unit_type === 'bulk') return 0.25
    return 0.25
  }

  function renderQty(item: GroceryListItem) {
    if (!prefs) return `${item.quantity} ${item.unit}`
    return displayQuantity(item.quantity, item.unit, item.unit_type, prefs)
  }

  if (loading) return <div className="text-stone-400 text-sm">Loading grocery list...</div>

  if (!prefs) return <div className="text-red-500 text-sm">Failed to load preferences</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-stone-800">Grocery List</h1>
        <div className="flex gap-2">
          {items.some(i => !i.is_manual) && (
            <button
              onClick={handleClearRecipe}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors border border-stone-200 px-3 py-1.5 rounded-lg"
            >
              Clear recipe items
            </button>
          )}
          {checked.length > 0 && (
            <button
              onClick={handleClearChecked}
              className="text-xs text-stone-400 hover:text-red-500 transition-colors border border-stone-200 px-3 py-1.5 rounded-lg"
            >
              Clear checked ({checked.length})
            </button>
          )}
        </div>
      </div>

      {/* Unit preference toggles */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-stone-500">Weight:</span>
          {['oz', 'g'].map(u => (
            <button
              key={u}
              onClick={() => handlePrefChange('weight_unit', u)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                prefs.weight_unit === u ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-500">Volume:</span>
          {['cup', 'ml'].map(u => (
            <button
              key={u}
              onClick={() => handlePrefChange('volume_unit', u)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                prefs.volume_unit === u ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-stone-500">Your grocery list is empty.</p>
          <Link href="/recipes" className="text-sm text-stone-800 font-medium hover:underline">
            Add ingredients from a recipe →
          </Link>
        </div>
      )}

      {/* Unchecked items grouped by category */}
      {Object.entries(uncheckedByCategory).map(([category, group]) => (
        <div key={category} className="space-y-1">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider px-1">{category}</p>
          <ul className="divide-y divide-stone-100 bg-white border border-stone-200 rounded-xl overflow-hidden">
            {group.map(item => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => handleCheck(item)}
                  className="w-4 h-4 rounded border-stone-300 accent-stone-800 cursor-pointer"
                />
                <span className="flex-1 text-sm text-stone-800 capitalize">{item.canonical_name}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustQty(item, -getStepForItem(item))}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-lg leading-none"
                  >
                    −
                  </button>
                  <span className="text-sm text-stone-600 min-w-[5rem] text-center">{renderQty(item)}</span>
                  <button
                    onClick={() => handleAdjustQty(item, getStepForItem(item))}
                    className="w-7 h-7 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-lg leading-none"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-stone-300 hover:text-red-400 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Checked items */}
      {checked.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-stone-400 font-medium uppercase tracking-wider px-1">Checked</p>
          <ul className="divide-y divide-stone-100 bg-white border border-stone-200 rounded-xl overflow-hidden opacity-50">
            {checked.map(item => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  checked={true}
                  onChange={() => handleCheck(item)}
                  className="w-4 h-4 rounded border-stone-300 accent-stone-800 cursor-pointer"
                />
                <span className="flex-1 text-sm text-stone-500 line-through capitalize">{item.canonical_name}</span>
                <span className="text-sm text-stone-400">{renderQty(item)}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-stone-300 hover:text-red-400 transition-colors text-xs px-1"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual add form */}
      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <p className="text-xs font-medium text-stone-500 mb-3 uppercase tracking-wider">Add ingredient manually</p>
        <form onSubmit={handleAddManual} className="flex flex-wrap gap-2 items-end">
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder="Ingredient name"
            className="flex-1 min-w-[140px] border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <input
            type="number"
            value={manualQty}
            onChange={e => setManualQty(e.target.value)}
            placeholder="Qty"
            min="0"
            step="0.25"
            className="w-20 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
          />
          <select
            value={manualUnitType}
            onChange={e => {
              const type = e.target.value as UnitTypeOption
              setManualUnitType(type)
              setManualUnit(UNIT_OPTIONS[type][0])
            }}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
          >
            {UNIT_TYPES.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={manualUnit}
            onChange={e => setManualUnit(e.target.value)}
            className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300 bg-white"
          >
            {UNIT_OPTIONS[manualUnitType].map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!manualName.trim() || !manualQty}
            className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  )
}
