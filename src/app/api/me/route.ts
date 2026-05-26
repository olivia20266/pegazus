import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'

export async function GET() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, wallets(*)')
    .eq('id', session.user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  const { data: transactions } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ ...profile, email: session.user.email, transactions: transactions || [] })
}
