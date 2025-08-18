<?php

use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectChatController;
use App\Http\Controllers\ProjectFileController;
use App\Http\Controllers\ProjectUserController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\UserController;

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
    // ユーザー一覧取得（アイコン情報含む）
    Route::get('users', [UserController::class, 'index']);

    // ユーザー個別の取得・更新（メール不使用、パスワードは別エンドポイント）
    Route::get('users/{user}', [UserController::class, 'show']);
    Route::put('users/{user}', [UserController::class, 'update']);               // JSON（画像なし）
    Route::post('users/{user}', [UserController::class, 'updateWithAvatar']);    // multipart（画像あり）
    Route::put('users/{user}/password', [UserController::class, 'updatePassword']); // 管理者/マネージャーのみ

    // チャンネル／メッセージ
    Route::apiResource('channels', ChannelController::class);
    Route::get('channels/{channel}/messages', [MessageController::class, 'index']);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store']);
    Route::apiResource('messages', MessageController::class);
    // メッセージ更新
    Route::put('channels/{channel}/messages/{message}', [MessageController::class, 'update']);
    Route::get('projects',         [ProjectController::class, 'index']);
    // プロジェクト作成（POST） ← ここを追加！
    Route::post('projects',         [ProjectController::class, 'store']);
    // プロジェクト詳細（GET）
    Route::get('projects/{project}', [ProjectController::class, 'show']);
    // プロジェクト更新（PATCH）
    Route::patch('projects/{project}', [ProjectController::class, 'update']);
    // プロジェクト削除（DELETE）
    Route::delete('projects/{project}', [ProjectController::class, 'destroy']);
    Route::get('/projects/{project}/users',             [ProjectUserController::class,'index']);
    Route::post('/projects/{project}/users',             [ProjectUserController::class,'store']);
    Route::put('/projects/{project}/users/{user}',       [ProjectUserController::class,'update']);
    Route::delete('/projects/{project}/users/{user}',      [ProjectUserController::class,'destroy']);
    Route::get('/projects/{project}/files',            [ProjectFileController::class,'index']);
    Route::post('/projects/{project}/files',            [ProjectFileController::class,'store']);
    Route::delete('/projects/{project}/files/{file}',     [ProjectFileController::class,'destroy']);

    // タスク
    Route::apiResource('projects.tasks', TaskController::class);

    // プロジェクトチャット
    Route::get ('/projects/{project}/chat',      [ProjectChatController::class,'show']);
    Route::post('/projects/{project}/chat/send', [ProjectChatController::class,'send']);

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
