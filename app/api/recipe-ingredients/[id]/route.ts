import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (body.canonical_name !== undefined) updates.canonical_name = body.canonical_name
  if (body.quantity !== undefined) updates.quantity = body.quantity
  if (body.unit !== undefined) updates.unit = body.unit
  if (body.unit_type !== undefined) updates.unit_type = body.unit_type

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update ingredient', detail: error }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('recipe_ingredients').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete ingredient', detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
