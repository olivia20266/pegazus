'use server'
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
//  Server Actions WALLET Ã¢ÂÂ exÃÂ©cutÃÂ©es uniquement cÃÂ´tÃÂ© serveur.
//  Aucune logique mÃÂ©tier ni clÃÂ© Supabase n'est exposÃÂ©e au client.
// Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'
import { generateOTP } from '@/lib/utils'

export async function depositAction(formData: FormData) {
  const session = await getServerSession()
  if (!session) return { error: 'Non autorisÃÂ©' }

  const amount = parseFloat(formData.get('amount') as string)
  const source = formData.get('source') as string

  if (!amount || amount < 50) return { error: 'Minimum 50 USD' }

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('user_id', session.user.id).single()
  if (!wallet) return { error: 'Wallet introuvable' }

  if (source === 'learning' && amount > wallet.learning_balance)
    return { error: 'Solde formation insuffisant' }

  const updates: Record<string, number> = {
    balance:    wallet.balance    + amount,
    free_margin: wallet.free_margin + amount,
  }
  if (source === 'learning') updates.learning_balance = wallet.learning_balance - amount

  await supabaseAdmin.from('wallets').update(updates).eq('user_id', session.user.id)
  await supabaseAdmin.from('transactions').insert({
    user_id:      session.user.id,
    type:         'DEPOSIT',
    amount,
    currency:     'USD',
    status:       'COMPLETED',
    source:       source === 'learning' ? 'Site de formation' : 'Virement bancaire',
    description:  `DÃÂ©pÃÂ´t depuis ${source === 'learning' ? 'le site de formation' : 'virement bancaire'}`,
    completed_at: new Date().toISOString(),
    destination:  null,
    reference:  null,
    adjust_type:  null,
    admin_note:   null,
    admin_id:     null,
    reason:       null,
  })

  revalidatePath('/wallet')
  return { ok: true, amount }
}

export async function requestWithdrawOtpAction() {
  const session = await getServerSession()
  if (!session) return { error: 'Non autorisÃÂ©' }

  const code      = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabaseAdmin.from('otp_codes').delete().eq('user_id', session.user.id).eq('purpose', 'withdraw')
  await supabaseAdmin.from('otp_codes').insert({ user_id: session.user.id, code, purpose: 'withdraw', used: false, expires_at: expiresAt })

  console.log(`[OTP RETRAIT] ${code}`)
  return { sent: true, devOtp: process.env.NODE_ENV === 'development' ? code : undefined }
}

export async function withdrawAction(formData: FormData) {
  const session = await getServerSession()
  if (!session) return { error: 'Non autorisÃÂ©' }

  const amount      = parseFloat(formData.get('amount') as string)
  const destination = formData.get('destination') as string
  const otpCode     = formData.get('otpCode') as string

  if (!amount || amount < 20) return { error: 'Minimum 20 USD' }
  if (!otpCode) return { error: 'Code OTP requis' }

  // VÃÂ©rifier OTP cÃÂ´tÃÂ© serveur uniquement
  const { data: otp } = await supabaseAdmin
    .from('otp_codes').select('*')
    .eq('user_id', session.user.id).eq('code', otpCode)
    .eq('used', false).gt('expires_at', new Date().toISOString()).single()

  if (!otp) return { error: 'Code OTP invalide ou expirÃÂ©' }
  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otp.id)

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('user_id', session.user.id).single()
  if (!wallet || amount > wallet.balance) return { error: 'Solde insuffisant' }

  const isInstant = destination === 'learning'
  const updates: Record<string, number> = {
    balance:    wallet.balance    - amount,
    free_margin: wallet.free_margin - amount,
  }
  if (isInstant) updates.learning_balance = wallet.learning_balance + amount

  await supabaseAdmin.from('wallets').update(updates).eq('user_id', session.user.id)
  await supabaseAdmin.from('transactions').insert({
    user_id:      session.user.id,
    type:         'WITHDRAWAL',
    amount:       -amount,
    currency:     'USD',
    status:       isInstant ? 'COMPLETED' : 'PENDING',
    destination:  isInstant ? 'Site de formation' : 'Virement bancaire',
    description:  `Retrait vers ${isInstant ? 'site de formation' : 'compte bancaire'}`,
    completed_at: isInstant ? new Date().toISOString() : null,
    source:  null,
    reference:  null,
    adjust_type:  null,
    admin_note:   null,
    admin_id:     null,
    reason:       null,
  })

  revalidatePath('/wallet')
  return { ok: true, amount, isInstant }
}
