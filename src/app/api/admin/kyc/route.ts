import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const docs = await prisma.kycDocument.findMany({ include: { user: { select: { firstName: true, lastName: true, email: true, country: true } } }, orderBy: { submittedAt: 'desc' } })
  return NextResponse.json({ documents: docs })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { userId, action, reason } = await req.json()
  const status = action === 'approve' ? 'verified' : 'rejected'
  await prisma.$transaction([
    prisma.kycDocument.update({ where: { userId }, data: { status, reviewedAt: new Date(), rejectionReason: reason || null } }),
    prisma.user.update({ where: { id: userId }, data: { kycStatus: status, kycVerifiedAt: action === 'approve' ? new Date() : null } }),
    prisma.auditLog.create({ data: { adminId: session.userId, targetUserId: userId, action: `kyc.${action}`, details: { reason } } }),
  ])
  return NextResponse.json({ success: true, status })
}
