import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const search    = searchParams.get('search') || ''
  const kycFilter = searchParams.get('kyc')

  let query = supabaseAdmin.from('profiles').select('*, wallets(*)').order('created_at', { ascending: false }).limit(100)

  if (kycFilter) query = query.eq('kyc_status', kycFilter)
  if (search)    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupérer les emails depuis Auth
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))

  return NextResponse.json((data || []).map(p => ({ ...p, email: emailMap.get(p.id) || '' })))
}
