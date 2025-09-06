import { NextConfig } from 'next';

// 環境変数があれば最優先（例: BACKEND_ORIGIN=http://192.168.24.200:8000）
const HOST =
    process.env.BACKEND_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
    (process.env.NODE_ENV === 'production'
        ? 'http://groupchat-kamaho-app:8000'   // 本番: コンテナ名＋ポート
        : 'http://192.168.24.200:8000');       // 開発: IPのAPI

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            // Sanctum CSRF
            { source: '/sanctum/:path*', destination: `${HOST}/sanctum/:path*` },

            // 認証系は「/api/*」ではなく web ルートへ中継（★重要）
            { source: '/login',    destination: `${HOST}/login` },
            { source: '/logout',   destination: `${HOST}/logout` },
            { source: '/register', destination: `${HOST}/register` },

            // 認証済みAPI
            { source: '/api/user',   destination: `${HOST}/api/user` },
            { source: '/api/:path*', destination: `${HOST}/api/:path*` },

            // Broadcasting 認証
            { source: '/broadcasting/auth', destination: `${HOST}/broadcasting/auth` },

            // ストレージ
            { source: '/storage/:path*', destination: `${HOST}/storage/:path*` },
        ];
    },

    // 同一オリジン中継のためCORSヘッダーは不要（Cookie同送と * は両立しない）
    async headers() {
        return [];
    },

    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },

    experimental: {
        turbo: {
            rules: {
                '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
            },
        },
    },
};

export default nextConfig;
