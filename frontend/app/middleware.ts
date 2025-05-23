// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証が必要なパス（login や静的リソースは除外）
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|login|api/login|api/register).*)'
    ],
};

export function middleware(request: NextRequest) {
    // Laravel のセッションキーが格納されている Cookie 名
    const session = request.cookies.get('laravel_session');

    // セッションがなければログインページへリダイレクト
    if (!session) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // 認証済みなら通常のレスポンスを継続
    return NextResponse.next();
}
