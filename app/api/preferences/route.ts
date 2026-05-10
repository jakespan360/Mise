import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase.from('user_preferences').select('*').limit(1).single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch preferences', detail: error }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const updates: Record<string, string> = {}
  if (body.weight_unit) updates.weight_unit = body.weight_unit
  if (body.volume_unit) updates.volume_unit = body.volume_unit

  const { data: existing } = await supabase.from('user_preferences').select('id').limit(1).single()
  if (!existing) {
    return NextResponse.json({ error: 'Preferences row not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to update preferences', detail: error }, { status: 500 })
  }

  return NextResponse.json(data)
}
