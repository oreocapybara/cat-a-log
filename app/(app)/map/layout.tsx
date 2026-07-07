import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Map',
  description: 'View stray cat sightings near you on an interactive map.',
  robots: { index: false, follow: false },
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children
}
