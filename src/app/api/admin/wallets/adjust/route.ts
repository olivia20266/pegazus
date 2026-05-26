import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession() as any
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Interdit' }, { status: 403 })

  const { userId, type, amount, reason, note } = await req.json()
  const amt = parseFloat(amount)
  if (!userId || !type || !amt || amt <= 0) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  if (!note || note.trim().length < 5) return NextResponse.json({ error: 'Note obligatoire (min 5 chars)' }, { status: 400 })

  const wallet = await prisma.wallet.findUnique({ where: { userId } })
  if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })
  if (type === 'debit' && amt > wallet.balance)
    return NextResponse.json({ error: 'Solde insuffisant pour ce débit' }, { status: 400 })

  const delta = type === 'credit' ? amt : -amt

  const [updatedWallet, tx, log] = await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: delta }, freeMargin: { increment: delta }, updatedAt: new Date() }
    }),
    prisma.transaction.create({
      data: {
        userId, type: 'manual_adjustment', subType: type,
        amount: delta, status: 'completed',
        description: `Ajustement admin — ${reason}`,
        adminNote: note, adminId: session.userId,
        completedAt: new Date(),
      }
    }),
    prisma.auditLog.create({
      data: {
        adminId: session.userId,
        targetUserId: userId,
        action: `wallet.adjust.${type}`,
        details: { amount: amt, reason, note, previousBalance: wallet.balance, newBalance: wallet.balance + delta },
      }
    }),
  ])

  return NextResponse.json({ wallet: updatedWallet, transaction: tx, audit: log })
}
