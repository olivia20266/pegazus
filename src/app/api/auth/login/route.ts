import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'
import { generateOTP } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  if (!email || !password)
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 })

  // Vérifier statut compte
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, status, login_attempts')
    .eq('id', (await supabaseAdmin.auth.admin.getUserByEmail(email))?.data?.user?.id || '')
    .single()

  if (profile?.status === 'LOCKED')
    return NextResponse.json({ error: 'Compte verrouillé. Contactez le support.' }, { status: 403 })

  // Auth Supabase
  const sb = createServerSupabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    // Incrémenter tentatives
    if (profile) {
      const attempts = (profile.login_attempts || 0) + 1
      await supabaseAdmin.from('profiles').update({
        login_attempts: attempts,
        status: attempts >= 5 ? 'LOCKED' : 'ACTIVE',
      }).eq('id', profile.id)
    }
    return NextResponse.json({ error: 'Identifiants incorrects', attemptsLeft: Math.max(0, 5 - ((profile?.login_attempts || 0) + 1)) }, { status: 401 })
  }

  // Reset tentatives
  await supabaseAdmin.from('profiles').update({ login_attempts: 0 }).eq('id', data.user.id)

  // Générer OTP
  const code      = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await supabaseAdmin.from('otp_codes').delete().eq('user_id', data.user.id).eq('purpose', 'login')
  await supabaseAdmin.from('otp_codes').insert({ user_id: data.user.id, code, purpose: 'login', used: false, expires_at: expiresAt })

  console.log(`[OTP LOGIN] ${email} → ${code}`)
  return NextResponse.json({
    userId: data.user.id,
    devOtp: process.env.NODE_ENV === 'development' ? code : undefined,
  })
}
