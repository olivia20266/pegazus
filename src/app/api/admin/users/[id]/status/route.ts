import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-guard'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'AccÃ¨s refusÃ©' }, { status: 403 })

  const { status, reason } = await req.json()
  if (!['ACTIVE','LOCKED','SUSPENDED'].includes(status))
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })

  await supabaseAdmin.from('profiles').update({ status }).eq('id', params.id)
  await supabaseAdmin.from('audit_logs').insert({
    admin_id: admin.user.id, target_id: params.id,
    action: `user.status.${status.toLowerCase()}`, details: { reason },
    ip:     null,
  })

  return NextResponse.json({ ok: true, status })
}
