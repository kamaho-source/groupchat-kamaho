<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ChannelController;
use Laravel\Sanctum\Http\Controllers\CsrfCookieController;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;

Route::middleware('api')->group(function () {
    // -------------------------------------------------
    // CSRF Cookie（Sanctum）
    // -------------------------------------------------
    Route::get('/sanctum/csrf-cookie', [CsrfCookieController::class, 'show']);

    // -------------------------------------------------
    // チャンネル・メッセージ API
    // -------------------------------------------------
    Route::apiResource('channels', ChannelController::class);
    Route::get('channels/{channel}/messages', [MessageController::class, 'index']);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store']);
    Route::apiResource('messages', MessageController::class);

    // -------------------------------------------------
    // 認証：ログイン／ログアウト
    // -------------------------------------------------
    // Fortify デフォルトのセッションコントローラを使う
    Route::post('/login',  [AuthenticatedSessionController::class, 'store']);
    Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
        ->middleware('auth:sanctum');

    // ログイン済みユーザー情報取得
    Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
        return $request->user();
    });

    // -------------------------------------------------
    // ユーザー登録：POST のみサポート
    // -------------------------------------------------
    // Fortify RegisteredUserController を利用
    Route::post('/register', [RegisteredUserController::class, 'store']);

    // GET での誤アクセスをキャッチして JSON 405 を返す
    Route::get('/register', function () {
        return response()->json([
            'message' => 'このエンドポイントは POST のみ対応しています',
        ], 405);
    });
});
