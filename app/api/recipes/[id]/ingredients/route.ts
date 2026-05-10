import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: recipe_id } = await params
  const { canonical_name, quantity, unit, unit_type } = await request.json()

  if (!canonical_name || quantity === undefined || !unit || !unit_type) {
    return NextResponse.json({ error: 'canonical_name, quantity, unit, and unit_type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert({ recipe_id, canonical_name, quantity, unit, unit_type, original_text: null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to add ingredient', detail: error }, { status: 500 })
  }

  return NextResponse.json(data)
}
