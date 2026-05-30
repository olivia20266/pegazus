import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const { action, reason, note } = await req.json()
  if (!['approve','reject'].includes(action))
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })

  const kycStatus   = action === 'approve' ? 'VERIFIED' : 'REJECTED'
  const updateData: Record<string, unknown> = { kyc_status: kycStatus }
  if (action === 'approve') updateData.kyc_verified_at = new Date().toISOString()

  await supabaseAdmin.from('profiles').update(updateData).eq('id', params.id)
  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: params.id,
    action: `kyc.${action}`, details: { reason, note },
    ip:     null,
  })

  return NextResponse.json({ ok: true, kycStatus })
}
