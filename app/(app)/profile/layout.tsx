import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile',
  description: 'View your Cat-A-Log profile, tagged cats, and account settings.',
  robots: { index: false, follow: false },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
