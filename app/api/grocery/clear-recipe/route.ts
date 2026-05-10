import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function DELETE() {
  const { error } = await supabase.from('grocery_list_items').delete().eq('is_manual', false)

  if (error) {
    return NextResponse.json({ error: 'Failed to clear recipe items', detail: error }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
