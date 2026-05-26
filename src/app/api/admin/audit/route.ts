import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const logs = await prisma.auditLog.findMany({
    include: { admin: { select: { firstName: true, lastName: true } }, targetUser: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ logs })
}
