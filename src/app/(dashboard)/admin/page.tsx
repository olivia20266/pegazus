import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const session = await getServerSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', session.user.id).single()

  if (!profile || !['ADMIN','SUPERADMIN'].includes(profile.role))
    redirect('/wallet')

  const [
    { count: totalUsers },
    { count: kycPending },
    { count: wdPending },
    { data: wallets },
    { data: users },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('*', { count:'exact', head:true }),
    supabaseAdmin.from('profiles').select('*', { count:'exact', head:true }).eq('kyc_status','PENDING'),
    supabaseAdmin.from('transactions').select('*', { count:'exact', head:true }).eq('type','WITHDRAWAL').eq('status','PENDING'),
    supabaseAdmin.from('wallets').select('balance'),
    supabaseAdmin.from('profiles').select('*, wallets(*)').order('created_at', { ascending:false }).limit(100),
  ])

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers()
  const emailMap = Object.fromEntries((authData?.users||[]).map(u=>[u.id, u.email||'']))
  const totalFunds = wallets?.reduce((s,w)=>s+(w.balance||0),0) || 0
  const usersWithEmail = (users||[]).map(u=>({ ...u, email: emailMap[u.id]||'' }))

  return (
    <AdminClient
      stats={{ totalUsers: totalUsers||0, kycPending: kycPending||0, wdPending: wdPending||0, totalFunds }}
      initialUsers={usersWithEmail}
      adminRole={profile.role}
    />
  )
}
