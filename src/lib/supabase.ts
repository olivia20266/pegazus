import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client navigateur (côté client React)
export function createBrowserSupabase() {
  return createBrowserClient<Database>(url, anon)
}

// Client admin serveur (contourne RLS — routes API admin uniquement)
export const supabaseAdmin = createClient<Database>(url, svc, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Client standard serveur (respecte RLS)
export const supabase = createClient<Database>(url, anon)
