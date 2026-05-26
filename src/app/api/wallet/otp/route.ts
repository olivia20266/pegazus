import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from '@/lib/supabase-server'
import { generateOTP } from '@/lib/utils'

export async function POST() {
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const code      = generateOTP()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await supabaseAdmin.from('otp_codes').delete().eq('user_id', session.user.id).eq('purpose', 'withdraw')
  await supabaseAdmin.from('otp_codes').insert({ user_id: session.user.id, code, purpose: 'withdraw', used: false, expires_at: expiresAt })

  console.log(`[OTP WITHDRAW] ${code}`)
  return NextResponse.json({ sent: true, devOtp: process.env.NODE_ENV === 'development' ? code : undefined })
}
