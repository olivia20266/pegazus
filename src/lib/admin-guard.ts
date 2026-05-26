import { supabaseAdmin } from './supabase'
import { getServerSession } from './supabase-server'

export async function requireAdmin() {
  const session = await getServerSession()
  if (!session) return null

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', session.user.id).single()

  if (!profile || !['ADMIN','SUPERADMIN'].includes(profile.role)) return null
  return { ...session, role: profile.role }
}
