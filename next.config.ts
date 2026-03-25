import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Allow any HTTPS image source for subscription logos
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default nextConfig
