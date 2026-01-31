<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthUserController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ChannelController;
use App\Http\Controllers\ChannelPrivacyController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectUserController;
use App\Http\Controllers\ProjectFileController;
use App\Http\Controllers\ProjectChatController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\AdminStatsController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Sanctum SPA(Cookie) 認証の前提：
| - /sanctum/csrf-cookie, /login, /logout, /register は routes/web.php 側へ
| - ここ（api.php）は auth:sanctum を前提に API 本体だけを置く
|
*/

/*
|--------------------------------------------------------------------------
| 認証後 API エンドポイント（Cookie認証）
|--------------------------------------------------------------------------
*/
Route::middleware([
    'auth:sanctum',
    'check.user.active', // ユーザーアクティブ状態チェック
])->group(function () {

    // 認証済みユーザー情報取得
    Route::get('user', [AuthUserController::class, 'show']);

    // ユーザー一覧取得（アイコン情報含む）
    Route::get('users', [UserController::class, 'index']);

    // ユーザー個別の取得・更新
    Route::get('users/{user}', [UserController::class, 'show']);
    Route::put('users/{user}', [UserController::class, 'update']);                // JSON（画像なし）
    Route::post('users/{user}', [UserController::class, 'updateWithAvatar']);     // multipart（画像あり）
    Route::put('users/{user}/password', [UserController::class, 'updatePassword']); // 管理者のみ
    Route::delete('users/{user}', [UserController::class, 'destroy']);            // アカウント削除

    // チャンネル一覧（権限に応じた結果のみ）
    Route::get('channels', [ChannelPrivacyController::class, 'index']);

    // 管理者向け統計
    Route::get('admin/stats', [AdminStatsController::class, 'index']);
    Route::get('admin/channel-activity', [AdminStatsController::class, 'channelActivity']);
    Route::get('admin/utilization', [AdminStatsController::class, 'utilization']);

    // プライバシー設定（管理者/マネージャー）
    Route::get('channels/{channel}/members', [ChannelPrivacyController::class, 'members']);
    Route::put('channels/{channel}/privacy', [ChannelPrivacyController::class, 'updatePrivacy']);

    // チャンネル／メッセージ（閲覧可能性を検証）
    Route::get('channels/{channel}', [ChannelController::class, 'show'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('channels', ChannelController::class);

    Route::get('channels/{channel}/messages', [MessageController::class, 'index'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::put('channels/{channel}/messages/{message}', [MessageController::class, 'update'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('messages', MessageController::class);

    // プロジェクト
    Route::get('projects', [ProjectController::class, 'index']);
    Route::post('projects', [ProjectController::class, 'store']);
    Route::get('projects/{project}', [ProjectController::class, 'show']);
    Route::patch('projects/{project}', [ProjectController::class, 'update']);
    Route::delete('projects/{project}', [ProjectController::class, 'destroy']);

    Route::get('projects/{project}/users', [ProjectUserController::class, 'index']);
    Route::post('projects/{project}/users', [ProjectUserController::class, 'store']);
    Route::put('projects/{project}/users/{user}', [ProjectUserController::class, 'update']);
    Route::delete('projects/{project}/users/{user}', [ProjectUserController::class, 'destroy']);

    Route::get('projects/{project}/files', [ProjectFileController::class, 'index']);
    Route::post('projects/{project}/files', [ProjectFileController::class, 'store']);
    Route::delete('projects/{project}/files/{file}', [ProjectFileController::class, 'destroy']);

    // タスク
    Route::apiResource('projects.tasks', TaskController::class);

    // プロジェクトチャット
    Route::get('projects/{project}/chat', [ProjectChatController::class, 'show']);
    Route::post('projects/{project}/chat/send', [ProjectChatController::class, 'send']);
});
