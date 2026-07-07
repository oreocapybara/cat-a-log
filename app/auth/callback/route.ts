import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/supabase/types'
import { getSafeRedirect } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const returnTo = getSafeRedirect(searchParams.get('returnTo'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`)
  }

  const cookieStore = await cookies()

  // Build a Supabase client that writes cookies onto the final response.
  // We collect cookies during exchangeCodeForSession and then copy them
  // onto the redirect response so the browser actually stores the session.
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
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

  // Determine where to redirect
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  let redirectUrl: string
  if (profile) {
    redirectUrl = `${origin}${returnTo}`
  } else {
    const setupProfileUrl = new URL('/setup-profile', origin)
    setupProfileUrl.searchParams.set('returnTo', returnTo)
    redirectUrl = setupProfileUrl.toString()
  }

  // Build the redirect response and copy session cookies onto it
  const response = NextResponse.redirect(redirectUrl)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
