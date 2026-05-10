import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing Supabase environment variables')
    _client = createClient(url, key)
  }
  return _client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export type Recipe = {
  id: string
  title: string
  source_url: string | null
  source_text: string | null
  created_at: string
  ingredients?: RecipeIngredient[]
}

export type RecipeIngredient = {
  id: string
  recipe_id: string
  canonical_name: string
  quantity: number
  unit: string
  unit_type: 'count' | 'weight' | 'volume' | 'bulk'
  original_text: string | null
}

export type GroceryListItem = {
  id: string
  canonical_name: string
  quantity: number
  unit: string
  unit_type: 'count' | 'weight' | 'volume' | 'bulk'
  is_manual: boolean
  checked: boolean
  source_recipe_ids: string[]
  updated_at: string
  category: string | null
}

export type UserPreferences = {
  id: string
  weight_unit: string
  volume_unit: string
}
