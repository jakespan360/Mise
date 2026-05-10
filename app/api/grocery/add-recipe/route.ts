import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { planGroceryMerge } from '@/lib/groceryMerge'

export async function POST(request: NextRequest) {
  try {
    const { recipeId } = await request.json()

    if (!recipeId) {
      return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
    }

    const { data: ingredients, error: ingError } = await supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)

    if (ingError || !ingredients) {
      return NextResponse.json({ error: 'Failed to fetch ingredients', detail: ingError }, { status: 500 })
    }

    const { data: existing, error: existingError } = await supabase
      .from('grocery_list_items')
      .select('*')

    if (existingError) {
      return NextResponse.json({ error: 'Failed to fetch grocery list', detail: existingError }, { status: 500 })
    }

    const actions = planGroceryMerge(ingredients, existing ?? [], recipeId)

    const inserts = actions.filter(a => a.type === 'insert').map(a => (a as Extract<typeof a, { type: 'insert' }>).item)
    const updates = actions.filter(a => a.type === 'update') as Extract<typeof actions[number], { type: 'update' }>[]

    if (inserts.length > 0) {
      const { error: insertError } = await supabase.from('grocery_list_items').insert(inserts)
      if (insertError) {
        return NextResponse.json({ error: 'Failed to insert items', detail: insertError }, { status: 500 })
      }
    }

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('grocery_list_items')
        .update({ quantity: update.quantity, source_recipe_ids: update.source_recipe_ids, updated_at: new Date().toISOString() })
        .eq('id', update.id)
      if (updateError) {
        return NextResponse.json({ error: 'Failed to update item', detail: updateError }, { status: 500 })
      }
    }

    const { data: updated, error: fetchError } = await supabase
      .from('grocery_list_items')
      .select('*')
      .order('updated_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch updated list', detail: fetchError }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(err) }, { status: 500 })
  }
}
