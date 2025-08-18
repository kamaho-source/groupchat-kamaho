// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: '鎌倉児童ホームチャットアプリ',
    description: 'A modern chat application with Chatwork-like UI',
};

const LARAVEL_SESSION_KEY = 'laravel_session';

async function getLaravelSession() {
    return (await cookies()).get(LARAVEL_SESSION_KEY);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const laravelSession = getLaravelSession();
    if (!laravelSession) redirect('/login');

    return (
        <html lang="ja">
        <body className={inter.className}>
        <AppRouterCacheProvider options={{ key: 'mui' }}>
            <Providers>{children}</Providers>
        </AppRouterCacheProvider>
        </body>
        </html>
    );
}
