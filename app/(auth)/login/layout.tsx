import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in',
  description:
    'Sign in to Cat-A-Log to tag stray cats, view sightings on the map, and vote on matches.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
