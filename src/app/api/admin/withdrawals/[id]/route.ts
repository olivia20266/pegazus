import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const { action, note } = await req.json()
  const { data: tx } = await supabaseAdmin.from('transactions').select('*').eq('id', params.id).single()
  if (!tx) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })

  if (action === 'approve') {
    await supabaseAdmin.from('transactions').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', params.id)
  } else {
    const amt = Math.abs(tx.amount)
    await supabaseAdmin.from('transactions').update({ status: 'CANCELLED' }).eq('id', params.id)
    const { data: wallet } = await supabaseAdmin.from('wallets').select('balance, free_margin').eq('user_id', tx.user_id).single()
    if (wallet) await supabaseAdmin.from('wallets').update({ balance: wallet.balance + amt, free_margin: wallet.free_margin + amt }).eq('user_id', tx.user_id)
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: tx.user_id,
    action: `withdrawal.${action}`, details: { note, amount: tx.amount },
    ip:     null,
  })

  return NextResponse.json({ ok: true, action })
}
