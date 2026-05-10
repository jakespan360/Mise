import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabase.from('recipes').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete recipe', detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
