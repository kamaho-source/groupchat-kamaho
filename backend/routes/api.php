<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\MessageController;

/*
|--------------------------------------------------------------------------
| SPA 認証後 API ルート (api ミドルウェア上で動作)
|--------------------------------------------------------------------------
*/
Route::middleware([
    EnsureFrontendRequestsAreStateful::class,
    'auth:sanctum',
])->group(function () {
    // 認証済みユーザー情報取得
    Route::get('user', function (Request $request) {
        return response()->json($request->user());
    });

    // チャンネル／メッセージ
    Route::apiResource('channels', ChannelController::class);
    Route::get('channels/{channel}/messages', [MessageController::class, 'index']);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store']);
    Route::apiResource('messages', MessageController::class);
    // メッセージ更新
    Route::put('channels/{channel}/messages/{message}', [MessageController::class, 'update']);

});

// ここから「認証前」のエンドポイントを定義
Route::middleware([
    EnsureFrontendRequestsAreStateful::class,
])->group(function () {
    // API プレフィックスでのログイン／ログアウト
    Route::post('login',  [AuthenticatedSessionController::class, 'store']);
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy']);
    // 必要に応じてユーザー登録
    Route::post('register', [RegisteredUserController::class, 'store']);
});
