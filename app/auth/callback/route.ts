import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

function getSafeReturnTo(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return '/map'
  }

  return returnTo
}

function createRedirectWithCookies(url: string | URL, cookiesToSet: CookieToSet[]) {
  const response = NextResponse.redirect(url)

  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`)
  }

  const requestCookies = new Map(
    request.cookies.getAll().map((cookie) => [cookie.name, cookie.value])
  )
  const cookiesToSet: CookieToSet[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Array.from(requestCookies, ([name, value]) => ({ name, value }))
        },
        setAll(newCookies) {
          newCookies.forEach((cookie) => {
            requestCookies.set(cookie.name, cookie.value)
            cookiesToSet.push(cookie)
          })
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`)
  }

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (profile) {
    return createRedirectWithCookies(`${origin}${returnTo}`, cookiesToSet)
  }

  const setupProfileUrl = new URL('/setup-profile', origin)
  setupProfileUrl.searchParams.set('returnTo', returnTo)

  return createRedirectWithCookies(setupProfileUrl, cookiesToSet)
}
