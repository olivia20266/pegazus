import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

// GET — liste des trades récents pour le dashboard admin
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  let query = supabaseAdmin
    .from('transactions')
    .select('*, profiles(first_name, last_name)')
    .eq('type', 'TRADE')
    .order('created_at', { ascending: false })
    .limit(100)

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data || [])
}
