import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
export async function POST() {
  const sb = createServerSupabase()
  await sb.auth.signOut()
  return NextResponse.json({ ok: true })
}
