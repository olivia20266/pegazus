import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisÃÂ©' }, { status: 401 })

  const { amount, source } = await req.json()
  const amt = parseFloat(amount)
  if (!amt || amt < 50) return NextResponse.json({ error: 'Minimum 50 USD' }, { status: 400 })

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('user_id', session.user.id).single()
  if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })

  if (source === 'learning' && amt > wallet.learning_balance)
    return NextResponse.json({ error: 'Solde formation insuffisant' }, { status: 400 })

  // MAJ wallet via RPC Supabase (atomique)
  const updates: Record<string, number> = {
    balance:    wallet.balance    + amt,
    free_margin: wallet.free_margin + amt,
  }
  if (source === 'learning') updates.learning_balance = wallet.learning_balance - amt

  const { data: updated } = await supabaseAdmin
    .from('wallets').update(updates).eq('user_id', session.user.id).select().single()

  const { data: tx } = await supabaseAdmin.from('transactions').insert({
    user_id:     session.user.id,
    type:        'DEPOSIT',
    amount:      amt,
    currency:    'USD',
    status:      'COMPLETED',
    source:      source === 'learning' ? 'Site de formation' : 'Virement bancaire',
    description: `DÃÂ©pÃÂ´t depuis ${source === 'learning' ? 'le site de formation' : 'virement bancaire'}`,
    completed_at: new Date().toISOString(),
    destination:  null,
    reference:  null,
    adjust_type:   null,
    admin_note:    null,
    admin_id:      null,
    reason:        null,
  }).select().single()

  return NextResponse.json({ wallet: updated, transaction: tx })
}
