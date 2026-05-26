import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const [
    { count: totalUsers },
    { count: kycPending },
    { count: wdPending },
    { data: walletAgg },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
    supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'WITHDRAWAL').eq('status', 'PENDING'),
    supabaseAdmin.from('wallets').select('balance, learning_balance'),
  ])

  const totalFunds = walletAgg?.reduce((s, w) => s + (w.balance || 0), 0) || 0

  return NextResponse.json({
    users:       { total: totalUsers || 0, kycPending: kycPending || 0 },
    withdrawals: { pending: wdPending || 0 },
    funds:       { total: totalFunds },
  })
}
