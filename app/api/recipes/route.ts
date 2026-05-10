import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch recipes', detail: error }, { status: 500 })
  }

  return NextResponse.json(recipes)
}
