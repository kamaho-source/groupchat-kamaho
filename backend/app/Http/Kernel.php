<?php

namespace App\Http;

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
            // 1) Cookie の復号
            EncryptCookies::class,

            // 2) クッキーをレスポンスに反映させる ← ここを追加
            AddQueuedCookiesToResponse::class,

            // 3) セッション開始・保存
            StartSession::class,

            // 4) セッションエラー共有
            ShareErrorsFromSession::class,

            // 5) CSRF 保護
            VerifyCsrfToken::class,

            // 6) ルートモデルバインディング
            SubstituteBindings::class,
        ],

        'api' => [
            // 1) SPA 認証（Sanctum）のため
            EnsureFrontendRequestsAreStateful::class,

            // 2) API スロットリング
            'throttle:api',

            // 3) Cookie の復号
            EncryptCookies::class,

            // 4) クッキーをレスポンスに反映
            AddQueuedCookiesToResponse::class,

            // 5) セッション開始・保存
            StartSession::class,

            // 6) CSRF 保護（必要に応じて）
            VerifyCsrfToken::class,

            // 7) ルートモデルバインディング
            SubstituteBindings::class,
        ],
    ];

    // 省略...
}
