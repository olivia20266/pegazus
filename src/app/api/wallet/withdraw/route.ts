import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisÃÂ©' }, { status: 401 })

  const { amount, destination, otpCode } = await req.json()
  const amt = parseFloat(amount)
  if (!amt || amt < 20) return NextResponse.json({ error: 'Minimum 20 USD' }, { status: 400 })

  // VÃÂ©rifier OTP
  const { data: otp } = await supabaseAdmin.from('otp_codes')
    .select('*').eq('user_id', session.user.id).eq('code', otpCode)
    .eq('used', false).gt('expires_at', new Date().toISOString()).single()
  if (!otp) return NextResponse.json({ error: 'Code OTP invalide' }, { status: 401 })
  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otp.id)

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('user_id', session.user.id).single()
  if (!wallet || amt > wallet.balance)
    return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })

  const isInstant = destination === 'learning'
  const updates: Record<string, number> = {
    balance:    wallet.balance    - amt,
    free_margin: wallet.free_margin - amt,
  }
  if (isInstant) updates.learning_balance = wallet.learning_balance + amt

  const { data: updated } = await supabaseAdmin
    .from('wallets').update(updates).eq('user_id', session.user.id).select().single()

  const { data: tx } = await supabaseAdmin.from('transactions').insert({
    user_id:      session.user.id,
    type:         'WITHDRAWAL',
    amount:       -amt,
    currency:     'USD',
    status:       isInstant ? 'COMPLETED' : 'PENDING',
    destination:  isInstant ? 'Site de formation' : 'Virement bancaire',
    description:  `Retrait vers ${isInstant ? 'site de formation' : 'compte bancaire'}`,
    completed_at: isInstant ? new Date().toISOString() : null,
    source:  null,
    reference:  null,
    adjust_type:   null,
    admin_note:    null,
    admin_id:      null,
    reason:        null,
  }).select().single()

  return NextResponse.json({ wallet: updated, transaction: tx })
}
