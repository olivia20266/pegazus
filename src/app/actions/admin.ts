'use server'
// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
//  Server Actions ADMIN ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ aucune clÃÂÃÂÃÂÃÂ© secrÃÂÃÂÃÂÃÂ¨te exposÃÂÃÂÃÂÃÂ©e au client.
// ÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂ
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function adjustBalanceAction(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'AccÃÂÃÂÃÂÃÂ¨s refusÃÂÃÂÃÂÃÂ©' }

  const userId = formData.get('userId') as string
  const type   = formData.get('type') as 'credit' | 'debit'
  const amount = parseFloat(formData.get('amount') as string)
  const reason = formData.get('reason') as string
  const note   = formData.get('note') as string

  if (!userId || !['credit','debit'].includes(type)) return { error: 'ParamÃÂÃÂÃÂÃÂ¨tres invalides' }
  if (!amount || amount <= 0) return { error: 'Montant invalide' }
  if (!note || note.trim().length < 10) return { error: 'Note interne requise (min 10 caractÃÂÃÂÃÂÃÂ¨res)' }

  const delta = type === 'credit' ? amount : -amount

  const { data: wallet } = await supabaseAdmin
    .from('wallets').select('*').eq('user_id', userId).single()
  if (!wallet) return { error: 'Wallet introuvable' }

  if (type === 'debit' && amount > wallet.balance)
    return { error: 'Solde insuffisant pour ce dÃÂÃÂÃÂÃÂ©bit' }

  const prevBalance = wallet.balance
  const newBalance  = prevBalance + delta

  await supabaseAdmin.from('wallets').update({
    balance:    newBalance,
    free_margin: wallet.free_margin + delta,
  }).eq('user_id', userId)

  await supabaseAdmin.from('transactions').insert({
    user_id:      userId,
    type:         'MANUAL_ADJUSTMENT',
    adjust_type:  type === 'credit' ? 'CREDIT' : 'DEBIT',
    amount:       delta,
    currency:     'USD',
    status:       'COMPLETED',
    reason,
    admin_note:   note,
    admin_id:     admin.user.id,
    description:  `Ajustement admin ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ ${reason}`,
    completed_at: new Date().toISOString(),
    source:      null,
    destination: null,
    reference:   null,
  })

  // Audit log ÃÂÃÂ¢ÃÂÃÂÃÂÃÂ immuable
  await supabaseAdmin.from('audit_logs').insert({
    admin_id:  admin.user.id,
    target_id: userId,
    action:    `wallet.adjust.${type}`,
    details:   { amount, reason, note, previousBalance: prevBalance, newBalance },
    ip:     null,
  })

  revalidatePath('/admin')
  return { ok: true, newBalance }
}

export async function updateKycAction(userId: string, action: 'approve' | 'reject', reason?: string) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'AccÃÂÃÂÃÂÃÂ¨s refusÃÂÃÂÃÂÃÂ©' }
  if (action === 'reject' && !reason) return { error: 'Motif de rejet requis' }

  const kycStatus = action === 'approve' ? 'VERIFIED' : 'REJECTED'
  await supabaseAdmin.from('profiles').update({
    kyc_status: kycStatus,
    kyc_verified_at: action === 'approve' ? new Date().toISOString() : null,
  }).eq('id', userId)

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: userId,
    action: `kyc.${action}`, details: { reason: reason ?? null },
    ip:     null,
  })

  revalidatePath('/admin')
  return { ok: true, kycStatus }
}

export async function updateUserStatusAction(userId: string, status: string, reason?: string) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'AccÃÂÃÂÃÂÃÂ¨s refusÃÂÃÂÃÂÃÂ©' }
  if (!['ACTIVE','LOCKED','SUSPENDED'].includes(status)) return { error: 'Statut invalide' }

  await supabaseAdmin.from('profiles').update({ status: status as 'ACTIVE' | 'LOCKED' | 'SUSPENDED' }).eq('id', userId)
  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: userId,
    action: `user.status.${status.toLowerCase()}`, details: { reason: reason ?? null },
    ip:     null,
  })

  revalidatePath('/admin')
  return { ok: true, status }
}

export async function processWithdrawalAction(txId: string, action: 'approve' | 'reject', note?: string) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'AccÃÂÃÂÃÂÃÂ¨s refusÃÂÃÂÃÂÃÂ©' }

  const { data: tx } = await supabaseAdmin.from('transactions').select('*').eq('id', txId).single()
  if (!tx) return { error: 'Transaction introuvable' }

  if (action === 'approve') {
    await supabaseAdmin.from('transactions').update({ status: 'COMPLETED', completed_at: new Date().toISOString() }).eq('id', txId)
  } else {
    const amt = Math.abs(tx.amount)
    const { data: w } = await supabaseAdmin.from('wallets').select('balance, free_margin').eq('user_id', tx.user_id).single()
    if (w) await supabaseAdmin.from('wallets').update({ balance: w.balance + amt, free_margin: w.free_margin + amt }).eq('user_id', tx.user_id)
    await supabaseAdmin.from('transactions').update({ status: 'CANCELLED' }).eq('id', txId)
  }

  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: tx.user_id,
    action: `withdrawal.${action}`, details: { note, amount: tx.amount },
    ip:     null,
  })

  revalidatePath('/admin')
  return { ok: true }
}

export async function getAdminStatsAction() {
  const admin = await requireAdmin()
  if (!admin) return null

  const [
    { count: totalUsers },
    { count: kycPending },
    { count: wdPending },
    { data: wallets },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('kyc_status', 'PENDING'),
    supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('type', 'WITHDRAWAL').eq('status', 'PENDING'),
    supabaseAdmin.from('wallets').select('balance'),
  ])

  return {
    totalUsers:  totalUsers  || 0,
    kycPending:  kycPending  || 0,
    wdPending:   wdPending   || 0,
    totalFunds:  wallets?.reduce((s, w) => s + w.balance, 0) || 0,
  }
}

export async function getAdminUsersAction(search = '', kycFilter = '') {
  const admin = await requireAdmin()
  if (!admin) return []

  let query = supabaseAdmin
    .from('profiles').select('*, wallets(*)')
    .order('created_at', { ascending: false }).limit(100)

  if (kycFilter) query = query.eq('kyc_status', kycFilter)
  if (search)    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`)

  const { data } = await query
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = new Map(authUsers.users.map(u => [u.id, u.email]))
  return (data || []).map(p => ({ ...p, email: emailMap.get(p.id) || '' }))
}
