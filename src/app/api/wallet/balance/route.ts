import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession() as any
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const wallet = await prisma.wallet.findUnique({ where: { userId: session.userId } })
  if (!wallet) return NextResponse.json({ error: 'Wallet introuvable' }, { status: 404 })

  const transactions = await prisma.transaction.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  return NextResponse.json({ wallet, transactions })
}
