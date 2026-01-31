<?php

use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| ここは「Cookie / Session / CSRF」を確実に確定させる領域です。
| SPA + Sanctum の場合、ログイン系は必ず web ミドルウェアで処理します。
|
*/

// 基本的なテストルート
Route::get('/test', function () {
    return response()->json([
        'message'   => 'Laravel is working!',
        'debug'     => config('app.debug'),
        'env'       => config('app.env'),
        'timestamp' => now()
    ]);
});

/*
|--------------------------------------------------------------------------
| Sanctum / Fortify（SPA Cookie 認証の要）
|--------------------------------------------------------------------------
|
| ★ 重要ポイント
| - CSRF Cookie
| - Login / Logout
| は必ず web middleware 配下で処理する
|
*/

Route::middleware('web')->group(function () {

    // CSRF Cookie（SPA 初期化時に必須）
    Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

    // ログイン（セッションを確実に保存）
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    // ログアウト
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy']);
});

/*
|--------------------------------------------------------------------------
| ここに純粋な Web ページルートがあれば追加
|--------------------------------------------------------------------------
*/
// Route::get('/', fn () => view('app'));
