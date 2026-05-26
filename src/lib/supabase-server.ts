import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Client serveur Next.js (lit les cookies de session Supabase Auth)
export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get:    (name)          => cookieStore.get(name)?.value,
        set:    (name, val, o)  => { try { cookieStore.set({ name, value: val, ...o }) } catch {} },
        remove: (name, o)       => { try { cookieStore.set({ name, value: '', ...o }) } catch {} },
      },
    }
  )
}

// Récupérer la session courante côté serveur
export async function getServerSession() {
  const sb = createServerSupabase()
  const { data: { session } } = await sb.auth.getSession()
  return session
}

// Récupérer le profil + wallet de l'utilisateur courant
export async function getServerUser() {
  const sb      = createServerSupabase()
  const session = await getServerSession()
  if (!session) return null

  const { data: profile } = await sb
    .from('profiles')
    .select('*, wallets(*)')
    .eq('id', session.user.id)
    .single()

  return profile ? { ...profile, email: session.user.email } : null
}
