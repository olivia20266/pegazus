import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

// ClÃ© secrÃ¨te partagÃ©e entre Vertex et Pegazus
const SECRET = process.env.VERTEX_MENTOR_SECRET || ''

function verifySignature(body: string, sig: string): boolean {
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
  return sig === expected
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('x-pegazus-key') || req.headers.get('x-vertex-signature') || ''

  if (!verifySignature(body, sig)) {
    console.warn('[Vertex Webhook] Signature invalide')
    return NextResponse.json({ error: 'Non autorisÃ©' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  const { event, data } = payload

  console.log(`[Vertex Webhook] event: ${event}`)

  switch (event) {

    // ââ Vertex : nouveau utilisateur crÃ©Ã© â crÃ©er compte Pegazus automatiquement
    case 'user.created': {
      const {
        learning_id, email, first_name, last_name,
        country, phone, initial_balance = 0
      } = data

      // VÃ©rifier si le compte Pegazus existe dÃ©jÃ 
      const { data: existing } = await supabaseAdmin
        .from('profiles').select('id').eq('learning_id', learning_id).single()

      if (existing) {
        return NextResponse.json({ ok: true, action: 'already_exists', pegazus_id: existing.id })
      }

      // CrÃ©er l'utilisateur dans Supabase Auth
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: crypto.randomBytes(16).toString('hex'), // Mot de passe alÃ©atoire
        email_confirm: true,
        user_metadata: { first_name, last_name, from_vertex: true }
      })

      if (authErr || !authUser.user) {
        console.error('[Vertex] Erreur crÃ©ation auth:', authErr)
        return NextResponse.json({ error: authErr?.message }, { status: 500 })
      }

      const uid = authUser.user.id
      const mt5 = Math.floor(10000000 + Math.random() * 89999999).toString()

      // CrÃ©er le profil Pegazus
      await supabaseAdmin.from('profiles').insert({
        id:          uid,
        first_name,
        last_name,
        country:     country || '',
        phone:       phone   || null,
        learning_id,
        role:        'USER',
        kyc_status:  'NOT_SUBMITTED',
        status:      'ACTIVE',
        leverage:    '1:50',
      })

      // CrÃ©er le wallet
      await supabaseAdmin.from('wallets').insert({
        user_id:          uid,
        balance:          initial_balance,
        equity:           initial_balance,
        margin:           0,
        free_margin:      initial_balance,
        floating_pl:      0,
        learning_balance: initial_balance,
        currency:         'USD',
        mt5_login:        mt5,
        mt5_server:       'Pegazus-Live01',
        source:  null,
        destination:  null,
        reference:  null,
      })

      // Transaction initiale si solde > 0
      if (initial_balance > 0) {
        await supabaseAdmin.from('transactions').insert({
          user_id:      uid,
          type:         'DEPOSIT',
          amount:       initial_balance,
          currency:     'USD',
          status:       'COMPLETED',
          source:       'Vertex Mentor',
          description:  'Compte crÃ©Ã© depuis Vertex Mentor',
          completed_at: new Date().toISOString(),
          destination:  null,
          reference:  null,
        })
      }

      // Log audit
      await supabaseAdmin.from('audit_logs').insert({
        admin_id:  uid,
        target_id: uid,
        action:    'user.created_from_vertex',
        details:   { learning_id, email, initial_balance, mt5_login: mt5 },
        ip:     null,
      })

      console.log(`[Vertex] Compte Pegazus crÃ©Ã© pour ${email} (${learning_id})`)
      return NextResponse.json({
        ok:          true,
        action:      'created',
        pegazus_id:  uid,
        mt5_login:   mt5,
      })
    }

    // ââ Vertex : mise Ã  jour du solde formation
    case 'balance.updated': {
      const { learning_id, new_balance } = data
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id').eq('learning_id', learning_id).single()

      if (!profile) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

      await supabaseAdmin.from('wallets')
        .update({ learning_balance: new_balance, updated_at: new Date().toISOString() })
        .eq('user_id', profile.id)

      return NextResponse.json({ ok: true })
    }

    // ââ Vertex : KYC validÃ© sur Vertex â MAJ Pegazus
    case 'kyc.verified': {
      const { learning_id } = data
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id').eq('learning_id', learning_id).single()

      if (profile) {
        await supabaseAdmin.from('profiles')
          .update({ kyc_status: 'VERIFIED', kyc_verified_at: new Date().toISOString() })
          .eq('id', profile.id)
      }
      return NextResponse.json({ ok: true })
    }

    // ââ Vertex admin ajuste le solde â rÃ©percuter sur Pegazus
    case 'admin.balance_adjusted': {
      const { learning_id, delta, reason, admin_note } = data
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('id').eq('learning_id', learning_id).single()

      if (!profile) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

      const { data: wallet } = await supabaseAdmin
        .from('wallets').select('*').eq('user_id', profile.id).single()

      if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })

      const newBalance = Math.max(0, wallet.balance + delta)

      await supabaseAdmin.from('wallets').update({
        balance:     newBalance,
        free_margin: newBalance - wallet.margin,
        updated_at:  new Date().toISOString(),
      }).eq('user_id', profile.id)

      await supabaseAdmin.from('transactions').insert({
        user_id:      profile.id,
        type:         'MANUAL_ADJUSTMENT',
        adjust_type:  delta > 0 ? 'CREDIT' : 'DEBIT',
        amount:       delta,
        currency:     'USD',
        status:       'COMPLETED',
        source:       'Admin Vertex Mentor',
        reason,
        admin_note,
        description:  `Ajustement depuis Vertex CRM â ${reason}`,
        completed_at: new Date().toISOString(),
        destination:  null,
        reference:  null,
      })

      return NextResponse.json({ ok: true, newBalance })
    }

    default:
      return NextResponse.json({ ok: true, action: 'ignored', event })
  }
}
