import { NextConfig } from 'next';

// 開発環境ではlocalhost、本番環境ではコンテナ名を使用
// 追加: 環境変数 BACKEND_ORIGIN/NEXT_PUBLIC_BACKEND_ORIGIN があればそれを優先
const ENV_BACKEND = process.env.BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
// next.config.ts 抜粋（任意）
const HOST = process.env.BACKEND_ORIGIN
    ?? (process.env.NODE_ENV === 'production'
        ? 'http://groupchat-kamaho-app:8000'
        : 'http://192.168.24.200:8000'); // ← ここだけ差し替え


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
            // Broadcasting 認証（PresenceChannel / PrivateChannel 用）
            {
                source: '/broadcasting/auth',
                destination: `${HOST}/broadcasting/auth`,
            },
            // その他の Laravel API
            {
                source: '/api/:path*',
                destination: `${HOST}/api/:path*`,
            },
            // ファイルストレージへのリライト
            {
                source: '/storage/:path*',
                destination: `${HOST}/storage/:path*`,
            },
        ];
    },
    
    // CORS設定（開発環境でのみ有効）
    async headers() {
        if (process.env.NODE_ENV === 'development') {
            return [
                {
                    source: '/(.*)',
                    headers: [
                        {
                            key: 'Access-Control-Allow-Origin',
                            value: '*',
                        },
                        {
                            key: 'Access-Control-Allow-Methods',
                            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                        },
                        {
                            key: 'Access-Control-Allow-Headers',
                            value: 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN',
                        },
                    ],
                },
            ];
        }
        return [];
    },

    eslint: {
        // 本番ビルドでは ESLint による失敗を無視（CI で実施推奨）
        ignoreDuringBuilds: true,
    },
    typescript: {
        // 型エラーでビルドを止めない（CI でチェック推奨）
        ignoreBuildErrors: true,
    },
    
    // 開発環境での最適化
    experimental: {
        // 開発環境での高速リロード
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
};

export default nextConfig;
