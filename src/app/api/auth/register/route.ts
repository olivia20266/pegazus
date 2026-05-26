import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { generateMT5Login, generateOTP } from '@/lib/utils'

const schema = z.object({
  firstName:   z.string().min(1),
  lastName:    z.string().min(1),
  email:       z.string().email(),
  password:    z.string().min(8),
  phone:       z.string().optional(),
  birthDate:   z.string().optional(),
  nationality: z.string().optional(),
  country:     z.string().optional(),
  learningId:  z.string().optional(),
  leverage:    z.string().optional(),
  securityQ:   z.string().optional(),
  securityA:   z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json()
    const data   = schema.parse(body)
    const mt5    = generateMT5Login()
    const learnBal = data.learningId ? 850 : 0

    // 1. Créer l'utilisateur Supabase Auth
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,  // Pas de vérif email en dev
    })
    if (authErr || !authData.user)
      return NextResponse.json({ error: authErr?.message || 'Erreur création compte' }, { status: 400 })

    const uid = authData.user.id

    // 2. Créer le profil
    const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
      id:           uid,
      first_name:   data.firstName,
      last_name:    data.lastName,
      phone:        data.phone || null,
      birth_date:   data.birthDate || null,
      nationality:  data.nationality || null,
      country:      data.country || null,
      learning_id:  data.learningId || null,
      leverage:     data.leverage || '1:50',
      security_q:   data.securityQ || null,
      security_a:   data.securityA || null,
      kyc_status:   'NOT_SUBMITTED',
      status:       'ACTIVE',
      role:         'USER',
    })
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid)
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }

    // 3. Créer le wallet
    await supabaseAdmin.from('wallets').insert({
      user_id:          uid,
      balance:          0,
      equity:           0,
      margin:           0,
      free_margin:      0,
      floating_pl:      0,
      learning_balance: learnBal,
      currency:         'USD',
      mt5_login:        mt5,
      mt5_server:       'Pegazus-Live01',
    })

    return NextResponse.json({ ok: true, userId: uid }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: 'Données invalides', details: err.errors }, { status: 400 })
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
