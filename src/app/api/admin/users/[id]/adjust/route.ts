import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'
import { z } from 'zod'

const schema = z.object({
  type:   z.enum(['credit', 'debit']),
  amount: z.number().positive(),
  reason: z.string(),
  note:   z.string().min(10),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'AccÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¨s refusÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©' }, { status: 403 })

  try {
    const body  = schema.parse(await req.json())
    const delta = body.type === 'credit' ? body.amount : -body.amount

    const { data: wallet } = await supabaseAdmin
      .from('wallets').select('*').eq('user_id', params.id).single()
    if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })

    if (body.type === 'debit' && body.amount > wallet.balance)
      return NextResponse.json({ error: 'Solde insuffisant' }, { status: 400 })

    const newBalance      = wallet.balance + delta
    const newLearningBal  = Math.max(0, wallet.learning_balance + delta)

    // ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ MAJ wallet (le trigger Supabase notifiera Vertex automatiquement)
    const { data: updated } = await supabaseAdmin
      .from('wallets')
      .update({
        balance:          newBalance,
        free_margin:      newBalance - wallet.margin,
        learning_balance: newLearningBal,
        updated_at:       new Date().toISOString(),
      })
      .eq('user_id', params.id)
      .select().single()

    // ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Transaction
    await supabaseAdmin.from('transactions').insert({
      user_id:      params.id,
      type:         'MANUAL_ADJUSTMENT',
      adjust_type:  body.type === 'credit' ? 'CREDIT' : 'DEBIT',
      amount:       delta,
      currency:     'USD',
      status:       'COMPLETED',
      reason:       body.reason,
      admin_note:   body.note,
      admin_id:     admin.user.id,
      description:  `Ajustement admin Pegazus ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ${body.reason}`,
      completed_at: new Date().toISOString(),
      source:  null,
      destination:  null,
      reference:  null,
    })

    // ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Audit log
    await supabaseAdmin.from('audit_logs').insert({
      admin_id:  admin.user.id,
      target_id: params.id,
      action:    `wallet.adjust.${body.type}`,
      details: {
        amount:  body.amount ?? null, reason:  body.reason ?? null, note:  body.note ?? null,
        previousBalance:  wallet.balance ?? null, newBalance: newBalance ?? null,
        previousLearning:  wallet.learning_balance ?? null,    newLearningBal ?? nullance: newLearningBal,
        syncedToVertex: true,
      },
      ip:     null,
    })

    // ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ Sync Vertex (fallback si le trigger pg_net ne marche pas)
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('learning_id, first_name, last_name').eq('id', params.id).single()

    if (profile?.learning_id) {
      try {
        await fetch(`${process.env.VERTEX_MENTOR_URL}/api/pegazus/sync`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Pegazus-Key': process.env.VERTEX_MENTOR_API_KEY || '',
          },
          body: JSON.stringify({
            event:           'wallet.updated',
            pegazus_user_id: params.id,
            learning_id:     profile.learning_id,
            first_name:      profile.first_name,
            last_name:       profile.last_name,
            balance:         newBalance,
            learning_balance: newLearningBal,
            delta_balance:   delta,
            reason:          body.reason,
            admin_note:      body.note,
            timestamp:       new Date().toISOString(),
          }),
        })
      } catch (e) {
        console.warn('[Vertex Sync] Fallback HTTP ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©chouÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©:', e)
        // Ne pas bloquer ÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ le trigger Supabase prend le relais
      }
    }

    return NextResponse.json({ wallet: updated, syncedToVertex: !!profile?.learning_id })

  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'DonnÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©es invalides', details: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
