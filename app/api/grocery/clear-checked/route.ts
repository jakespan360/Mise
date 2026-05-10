import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE() {
  const { error } = await supabase.from('grocery_list_items').delete().eq('checked', true)

  if (error) {
    return NextResponse.json({ error: 'Failed to clear checked items', detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
