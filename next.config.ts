import type { NextConfig } from 'next';

/**
 * Media is served from the API (Cloudflare R2 behind it) and, during development,
 * from Unsplash — the prototype's seed covers are Unsplash ids (data.jsx).
 * FR-NFR-PERF-08: the API generates no derivative sizes, so Next.js owns resizing.
 */
function remotePatternsFromEnv(): NonNullable<NextConfig['images']>['remotePatterns'] {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'https', hostname: 'images.unsplash.com' },
    { protocol: 'https', hostname: 'images.pexels.com' },
  ];

  for (const raw of [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_MEDIA_BASE_URL,
  ]) {
    if (!raw) continue;
    try {
      const { protocol, hostname, port } = new URL(raw);
      patterns.push({
        protocol: protocol.replace(':', '') as 'http' | 'https',
        hostname,
        ...(port ? { port } : {}),
      });
    } catch {
      // A malformed base URL is caught by the env schema at runtime; ignore here
      // so a bad value cannot break `next build` before that error can surface.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  eslint: {
    dirs: ['src'],
  },

  images: {
    remotePatterns: remotePatternsFromEnv(),
  },

  experimental: {
    // MapLibre and the Radix set are large; keep them out of the initial chunk.
    optimizePackageImports: ['maplibre-gl', '@dnd-kit/core', '@dnd-kit/sortable'],
  },
};

export default nextConfig;
