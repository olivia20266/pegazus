import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const withdrawals = await prisma.transaction.findMany({
    where: { type: 'withdrawal' },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ withdrawals })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  const { txId, action } = await req.json()
  const tx = await prisma.transaction.findUnique({ where: { id: txId } })
  if (!tx) return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 })
  const updates: any[] = [
    prisma.transaction.update({ where: { id: txId }, data: { status: action === 'approve' ? 'completed' : 'rejected', completedAt: new Date() } }),
    prisma.auditLog.create({ data: { adminId: session.userId, action: `withdrawal.${action}`, details: { txId, amount: tx.amount } } }),
  ]
  if (action === 'reject') {
    updates.push(prisma.wallet.update({ where: { userId: tx.userId }, data: { balance: { decrement: tx.amount }, freeMargin: { decrement: tx.amount } } }))
  }
  await prisma.$transaction(updates)
  return NextResponse.json({ success: true })
}
