import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  const updates: Record<string, unknown> = {}
  if (typeof body.quantity === 'number') updates.quantity = body.quantity
  if (typeof body.checked === 'boolean') updates.checked = body.checked
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('grocery_list_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update item', detail: error }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('grocery_list_items').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete item', detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
