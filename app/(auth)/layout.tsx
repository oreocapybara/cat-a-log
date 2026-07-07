import type { Metadata } from 'next'

// Auth group layout — no visual wrapper needed; exists to scope metadata to
// the (auth) route group without duplicating it across every page file.
export const metadata: Metadata = {
  // Individual pages override `title` via their own exported metadata.
  // This sets OG/Twitter defaults for the entire auth group.
  openGraph: {
    type: 'website',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
