import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function getSafeReturnTo(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return '/map'
  }

  return returnTo
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`)
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?oauth_error=1`)
  }

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).single()

  if (profile) {
    return NextResponse.redirect(`${origin}${returnTo}`)
  }

  const setupProfileUrl = new URL('/setup-profile', origin)
  setupProfileUrl.searchParams.set('returnTo', returnTo)

  return NextResponse.redirect(setupProfileUrl)
}
