import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret')

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}
export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}
export async function signToken(payload: Record<string, unknown>, expiresIn = '7d') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch { return null }
}
export async function getSession() {
  const token = cookies().get('sb_token')?.value
  if (!token) return null
  return verifyToken(token)
}
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
export function generateMT5Login(): string {
  return Math.floor(10000000 + Math.random() * 89999999).toString()
}
