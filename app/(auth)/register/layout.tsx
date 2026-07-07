import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create a Cat-A-Log account to start tagging stray cats in your neighborhood.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
