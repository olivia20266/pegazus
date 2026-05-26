import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Vertex peut interroger Pegazus pour vérifier/récupérer un utilisateur
export async function GET(req: NextRequest) {
  const apiKey = req.headers.get('x-pegazus-key')
  if (apiKey !== process.env.VERTEX_MENTOR_API_KEY)
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const learningId = searchParams.get('learning_id')
  if (!learningId) return NextResponse.json({ error: 'learning_id requis' }, { status: 400 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*, wallets(*)')
    .eq('learning_id', learningId)
    .single()

  if (!profile) return NextResponse.json({ exists: false }, { status: 404 })

  return NextResponse.json({
    exists:          true,
    pegazus_id:      profile.id,
    kyc_status:      profile.kyc_status,
    status:          profile.status,
    balance:         profile.wallets?.balance || 0,
    learning_balance: profile.wallets?.learning_balance || 0,
    mt5_login:       profile.wallets?.mt5_login,
  })
}
