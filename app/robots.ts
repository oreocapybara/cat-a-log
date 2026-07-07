import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cat-a-log.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register'],
      disallow: ['/map', '/tag', '/profile', '/setup-profile', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
