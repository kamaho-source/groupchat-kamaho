import type { NextConfig } from 'next';

const backend = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:8000';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/sanctum/:path*', destination: `${backend}/sanctum/:path*` },
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/login', destination: `${backend}/login` },
      { source: '/logout', destination: `${backend}/logout` },
      { source: '/user', destination: `${backend}/user` },
    ];
  },
};

export default nextConfig;
