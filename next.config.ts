import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {
    // A parent directory's package-lock.json otherwise gets misdetected as the workspace root.
    root: path.join(__dirname),
  },
}

export default nextConfig
