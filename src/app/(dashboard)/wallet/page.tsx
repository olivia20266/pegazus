import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import WalletClient from './WalletClient'

export default async function WalletPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*, wallets(*)').eq('id', session.user.id).single(),
    supabaseAdmin.from('transactions').select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20),
  ])

  if (!profile) redirect('/login')

  return (
    <WalletClient
      user={{
        id:        profile.id,
        firstName: profile.first_name,
        lastName:  profile.last_name,
        email:     session.user.email || '',
        kycStatus: profile.kyc_status,
        role:      profile.role,
      }}
      wallet={profile.wallets as any}
      transactions={transactions || []}
    />
  )
}
