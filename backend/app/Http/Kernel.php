<?php

namespace App\Http;

use App\Http\Middleware\CorsMiddleware;
use Illuminate\Foundation\Http\Kernel as HttpKernel;

// SPA 認証用
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// Cookie／セッション／CSRF まわり
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class Kernel extends HttpKernel
{
    // 省略...

    protected $middlewareGroups = [
        'web' => [
            // 1) CORS 処理（最初に実行）
            \App\Http\Middleware\CorsMiddleware::class,

            // 2) Cookie の復号
            EncryptCookies::class,

            // 3) クッキーをレスポンスに反映させる ← ここを追加
            AddQueuedCookiesToResponse::class,

            // 4) セッション開始・保存
            StartSession::class,

            // 5) セッションエラー共有
            ShareErrorsFromSession::class,

            // 6) CSRF 保護
            VerifyCsrfToken::class,

            // 7) ルートモデルバインディング
            SubstituteBindings::class,
        ],

        'api' => [
            // 1) CORS 処理（最初に実行）
           CorsMiddleware::class,

            // 2) SPA 認証（Sanctum）のため
            EnsureFrontendRequestsAreStateful::class,

            // 3) API スロットリング
            'throttle:api',

            // 4) ルートモデルバインディング
            SubstituteBindings::class,
        ],
    ];

    // 省略...
}
