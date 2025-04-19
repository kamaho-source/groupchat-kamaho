<?php


namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

class Kernel extends HttpKernel
{
    // 省略...

    protected $middlewareGroups = [
        // 既存の web グループはそのまま
        'web' => [
            // ...
        ],

        // ここが API グループ
        'api' => [
            // ① Sanctum 用ミドルウェアを先頭に
            EnsureFrontendRequestsAreStateful::class,

            // ② API レートリミット
            'throttle:api',

            // ③ ルートバインディング
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    // 省略...
}
