<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Cloudflare Tunnel などのリバースプロキシ経由で HTTPS を正しく認識させる
        $middleware->trustProxies(at: '*');

        $middleware->statefulApi();

        // Sanctumのセッション認証を有効化
        $middleware->api(prepend: [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // CSRF除外設定を追加
        $middleware->validateCsrfTokens(except: [
            'api/*',
            'login',
            'register',
            'logout',
        ]);

        // ユーザーアクティブ状態チェックミドルウェアを登録
        $middleware->alias([
            'check.user.active' => \App\Http\Middleware\CheckUserActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
