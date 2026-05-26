import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { signToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json()
    const otp = await prisma.otpCode.findFirst({ where: { userId, code, used: false, expiresAt: { gt: new Date() } } })
    if (!otp) return NextResponse.json({ error: 'Code invalide ou expiré' }, { status: 401 })

    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } })
    const user = await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() }, include: { wallet: true } })

    const token = await signToken({ userId: user.id, role: user.role, email: user.email })
    cookies().set('sb_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 })

    const { passwordHash: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser, wallet: user.wallet })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
