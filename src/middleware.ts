import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get:    (name) => req.cookies.get(name)?.value,
        set:    (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options)        => res.cookies.set({ name, value: '', ...options }),
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isPublic  = ['/login', '/register'].some(r => pathname.startsWith(r))
  const isAdmin   = pathname.startsWith('/admin')
  const isApi     = pathname.startsWith('/api')

  if (isApi) return res

  if (session && isPublic)
    return NextResponse.redirect(new URL('/wallet', req.url))

  if (!session && !isPublic)
    return NextResponse.redirect(new URL('/login', req.url))

  if (session && isAdmin) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', session.user.id).single()
    if (!profile || !['ADMIN','SUPERADMIN'].includes(profile.role))
      return NextResponse.redirect(new URL('/wallet', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
