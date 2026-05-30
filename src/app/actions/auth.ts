'use server'
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
//  Server Actions AUTH â tout s'exÃ©cute cÃ´tÃ© serveur uniquement.
//  Le code de ce fichier n'est JAMAIS envoyÃ© au navigateur.
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { createServerSupabase } from '@/lib/supabase-server'
import { generateMT5Login, generateOTP } from '@/lib/utils'

const registerSchema = z.object({
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

export async function registerAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) return { error: 'DonnÃ©es invalides' }

  const data      = parsed.data
  const mt5       = generateMT5Login()
  const learnBal  = data.learningId ? 850 : 0

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email: data.email, password: data.password, email_confirm: true,
  })
  if (authErr || !authData.user) return { error: authErr?.message || 'Erreur crÃ©ation compte' }

  const uid = authData.user.id

  const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
    id: uid, first_name: data.firstName, last_name: data.lastName,
    phone: data.phone || null, birth_date: data.birthDate || null,
    nationality: data.nationality || null, country: data.country || null,
    learning_id: data.learningId || null, leverage: data.leverage || '1:50',
    security_q: data.securityQ || null, security_a: data.securityA || null,
    kyc_status: 'NOT_SUBMITTED', status: 'ACTIVE', role: 'USER',
  })
  if (profileErr) {
    await supabaseAdmin.auth.admin.deleteUser(uid)
    return { error: 'Erreur crÃ©ation profil' }
  }

  await supabaseAdmin.from('wallets').insert({
    user_id: uid, balance: 0, equity: 0, margin: 0,
    free_margin: 0, floating_pl: 0, learning_balance: learnBal,
    currency: 'USD', mt5_login: mt5, mt5_server: 'Pegazus-Live01',
    source:  null,
    destination:  null,
    reference:  null,
  })

  // Connecter automatiquement
  const sb = createServerSupabase()
  await sb.auth.signInWithPassword({ email: data.email, password: data.password })

  redirect('/wallet')
}

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email    = formData.get('email')    as string
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Champs requis' }

  // VÃ©rifier statut compte avant auth
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
  if (authUser?.user) {
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('status').eq('id', authUser.user.id).single()
    if (profile?.status === 'LOCKED') return { error: 'Compte verrouillÃ©. Contactez le support.' }
  }

  const sb = createServerSupabase()
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    // IncrÃ©menter les tentatives cÃ´tÃ© serveur
    if (authUser?.user) {
      const { data: p } = await supabaseAdmin.from('profiles').select('login_attempts').eq('id', authUser.user.id).single()
      const attempts = (p?.login_attempts || 0) + 1
      await supabaseAdmin.from('profiles').update({ login_attempts: attempts, status: attempts >= 5 ? 'LOCKED' : 'ACTIVE' }).eq('id', authUser.user.id)
      return { error: 'Identifiants incorrects', attemptsLeft: Math.max(0, 5 - attempts) }
    }
    return { error: 'Identifiants incorrects' }
  }

  await supabaseAdmin.from('profiles').update({ login_attempts: 0 }).eq('id', data.user.id)

  // GÃ©nÃ©rer OTP
  const code      = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await supabaseAdmin.from('otp_codes').delete().eq('user_id', data.user.id).eq('purpose', 'login')
  await supabaseAdmin.from('otp_codes').insert({ user_id: data.user.id, code, purpose: 'login', used: false, expires_at: expiresAt })

  console.log(`[OTP] ${email} â ${code}`)

  return {
    userId:  data.user.id,
    devOtp:  process.env.NODE_ENV === 'development' ? code : undefined,
  }
}

export async function verifyOtpAction(userId: string, code: string) {
  const { data: otp } = await supabaseAdmin
    .from('otp_codes').select('*')
    .eq('user_id', userId).eq('code', code).eq('used', false)
    .gt('expires_at', new Date().toISOString()).single()

  if (!otp) return { error: 'Code invalide ou expirÃ©' }

  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otp.id)
  await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId)

  return { ok: true }
}

export async function logoutAction() {
  const sb = createServerSupabase()
  await sb.auth.signOut()
  redirect('/login')
}
