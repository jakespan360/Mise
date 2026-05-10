import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { canonical_name, quantity, unit, unit_type } = await request.json()

    if (!canonical_name || quantity === undefined || !unit || !unit_type) {
      return NextResponse.json({ error: 'canonical_name, quantity, unit, and unit_type are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('grocery_list_items')
      .insert({ canonical_name, quantity, unit, unit_type, is_manual: true, checked: false, source_recipe_ids: [] })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to add item', detail: error }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Unexpected error', detail: String(err) }, { status: 500 })
  }
}
