import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '鎌倉児童ホームチャットアプリ',
    description: 'A modern chat application with Chatwork-like UI',
};

const LARAVEL_SESSION_KEY = 'laravel_session';

async function getLaravelSession() {
    return (await cookies()).get(LARAVEL_SESSION_KEY);
}

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    // Laravel セッション Cookie をサーバーサイドでチェック
    const laravelSession = getLaravelSession();
    if (!laravelSession) {
        // セッションが存在しない場合はログインページへリダイレクト
        redirect('/login');
    }

    return (
        <html lang="ja">
        <body className={inter.className}>{children}</body>
        </html>
    );
}