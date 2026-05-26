import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId, code } = await req.json()

  const { data: otp } = await supabaseAdmin
    .from('otp_codes')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!otp)
    return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 401 })

  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otp.id)
  await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId)

  // Récupérer profil + wallet
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, wallets(*)')
    .eq('id', userId)
    .single()

  return NextResponse.json({ ok: true, profile })
}
