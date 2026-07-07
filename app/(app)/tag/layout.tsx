import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tag a Cat',
  description: 'Snap a photo and tag a stray cat at your current location.',
  robots: { index: false, follow: false },
}

export default function TagLayout({ children }: { children: React.ReactNode }) {
  return children
}
