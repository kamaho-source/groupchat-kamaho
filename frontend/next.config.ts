import { NextConfig } from 'next';

// next.config.ts
const HOST = 'http://host.docker.internal:8000';

const nextConfig: NextConfig = {
    async rewrites() {
        return [
            // Sanctum の CSRF Cookie
            {
                source: '/sanctum/:path*',
                destination: `${HOST}/sanctum/:path*`,
            },
            // 認証前：ログイン／ログアウト／登録
            {
                source: '/api/login',
                destination: `${HOST}/api/login`,
            },
            {
                source: '/api/logout',
                destination: `${HOST}/api/logout`,
            },
            {
                source: '/api/register',
                destination: `${HOST}/api/register`,
            },
            // 認証済み：ユーザー情報取得
            {
                source: '/api/user',
                destination: `${HOST}/api/user`,
            },
            // その他の Laravel API
            {
                source: '/api/:path*',
                destination: `${HOST}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
