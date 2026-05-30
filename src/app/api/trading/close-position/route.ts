import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©' }, { status: 401 })

  const {
    positionId, symbol, type, lot,
    openPrice, closePrice, pl, reason, isWin
  } = await req.json()

  const userId = session.user.id

  // 1. RÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©cupÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©rer le wallet actuel
  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })

  const newBalance    = Math.max(0, wallet.balance + pl)
  const newLearningBal = Math.max(0, wallet.learning_balance + pl)

  // 2. Mettre ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ  jour le wallet (balance + learning_balance en mÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂªme temps)
  const { data: updatedWallet } = await supabaseAdmin
    .from('wallets')
    .update({
      balance:          newBalance,
      free_margin:      newBalance - wallet.margin,
      learning_balance: newLearningBal,
      updated_at:       new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()

  // 3. Enregistrer la transaction
  await supabaseAdmin.from('transactions').insert({
    user_id:      userId,
    type:         'TRADE',
    amount:       pl,
    currency:     'USD',
    status:       'COMPLETED',
    source:       symbol,
    description:  `Trade fermÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ© ${type} ${lot} lot ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ${reason} (${isWin ? 'gain' : 'perte'})`,
    completed_at: new Date().toISOString(),
    destination:  null,
    reference:  null,
    adjust_type:   null,
    admin_note:    null,
    admin_id:      null,
    reason:        null,
  })

  // 4. Notification admin (entrÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ©e dans audit_logs pour que l'admin voie)
  await supabaseAdmin.from('audit_logs').insert({
    admin_id:  userId,   // On utilise userId comme placeholder (sera vu par admin)
    target_id: userId,
    action:    isWin ? 'trade.win' : 'trade.loss',
    details: {
      symbol: symbol ?? null, type: type ?? null, lot: lot ?? null, openPrice: openPrice ?? null, closePrice: closePrice ?? null,
      pl: pl ?? null, reason: reason ?? null,
      previousBalance:  wallet.balance ?? null,
      newBalance: newBalance ?? null,
         newLearningBalance: newLearningBal,
    },
    ip:     null,
  })

  // 5. Sync vertex-mentor.com (envoi automatique du nouveau solde)
  try {
    const vertexRes = await fetch(
      `${process.env.VERTEX_MENTOR_URL}/api/pegazus/sync-balance`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'X-API-Key':     process.env.VERTEX_MENTOR_API_KEY || '',
          'X-Secret':      process.env.VERTEX_MENTOR_SECRET  || '',
        },
        body: JSON.stringify({
          userId,
          learningId:      wallet.user_id,        // lien avec le compte vertex
          newBalance:      newLearningBal,
          delta:           pl,
          reason:          isWin ? 'trade_profit' : 'trade_loss',
          tradeDetails:    { symbol, type, lot, openPrice, closePrice, pl, reason },
          timestamp:       new Date().toISOString(),
        }),
      }
    )
    if (!vertexRes.ok) console.error('[Vertex] Sync failed:', await vertexRes.text())
  } catch (err) {
    // Ne pas bloquer si vertex est indisponible ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ on logue seulement
    console.error('[Vertex] Unreachable:', err)
  }

  return NextResponse.json({
    ok:             true,
    newBalance,
    newLearningBalance: newLearningBal,
    wallet:         updatedWallet,
  })
}
