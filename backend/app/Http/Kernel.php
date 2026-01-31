<?php

namespace App\Http;

use App\Http\Middleware\CorsMiddleware;
use Illuminate\Foundation\Http\Kernel as HttpKernel;

// SPA 認証用
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

// Cookie／セッション／CSRF
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class Kernel extends HttpKernel
{
    protected $middlewareGroups = [

        /*
        |--------------------------------------------------------------------------
        | Web Middleware Group
        |--------------------------------------------------------------------------
        |
        | セッション + CSRF + Cookie を使う通常の Web リクエスト
        |
        */
        'web' => [
            CorsMiddleware::class,

            EncryptCookies::class,
            AddQueuedCookiesToResponse::class,

            StartSession::class,
            ShareErrorsFromSession::class,

            VerifyCsrfToken::class,

            SubstituteBindings::class,
        ],

        /*
        |--------------------------------------------------------------------------
        | API Middleware Group（Sanctum SPA）
        |--------------------------------------------------------------------------
        |
        | セッション開始は EnsureFrontendRequestsAreStateful に任せる
        | StartSession を直接入れないのが重要
        |
        */
        'api' => [
            CorsMiddleware::class,

            // ★ Sanctum が Cookie / Session を制御する
            EnsureFrontendRequestsAreStateful::class,

            'throttle:api',

            SubstituteBindings::class,
        ],
    ];
}
