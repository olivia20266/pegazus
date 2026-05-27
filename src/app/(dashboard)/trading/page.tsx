import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import TradingClient from './TradingClient'

export default async function TradingPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('*, wallets(*)').eq('id', session.user.id).single()

  if (!profile) redirect('/login')

  return (
    <TradingClient
      user={{
        id:        profile.id,
        firstName: profile.first_name,
        lastName:  profile.last_name,
        email:     session.user.email || '',
        role:      profile.role,
        kycStatus: profile.kyc_status,
      }}
      wallet={profile.wallets as any}
    />
  )
}
