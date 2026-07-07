import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Set up your profile',
  description: 'Choose a username and finish setting up your Cat-A-Log profile.',
  robots: { index: false, follow: false },
}

export default function SetupProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
