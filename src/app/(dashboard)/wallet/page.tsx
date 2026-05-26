// Server Component — jamais envoyé au navigateur
// Toute la logique DB est ici, côté serveur uniquement
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import WalletClient from './WalletClient'

export default async function WalletPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  // Fetch serveur — ces données ne quittent JAMAIS le serveur en clair
  const [{ data: profile }, { data: transactions }] = await Promise.all([
    supabaseAdmin.from('profiles').select('*, wallets(*)').eq('id', session.user.id).single(),
    supabaseAdmin.from('transactions').select('*').eq('user_id', session.user.id)
      .order('created_at', { ascending: false }).limit(20),
  ])

  if (!profile) redirect('/login')

  // On passe uniquement les données nécessaires au composant client
  // Jamais les clés API, jamais supabaseAdmin
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
