<?php

use Illuminate\Support\Facades\Route;
// ルート側では EnsureFrontendRequestsAreStateful を使いません
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;
use Laravel\Fortify\Http\Controllers\RegisteredUserController;

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
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

/*
|--------------------------------------------------------------------------
| 認証前 API エンドポイント（CSRF検証なし）
|--------------------------------------------------------------------------
|
| ※ Fortify のセッションログインを「web」ミドルウェアで処理する場合は
|   /login /register を routes/web.php 側に移す運用が推奨です。
|   ここではご要望どおり api.php を最小修正のみとし、既存ルートを維持します。
|
*/
Route::post('login', [AuthenticatedSessionController::class, 'store']);
Route::post('register', [RegisteredUserController::class, 'store']);
Route::post('users', [UserController::class, 'store']); // 認証不要での新規ユーザー作成

/*
|--------------------------------------------------------------------------
| 認証後 API エンドポイント
|--------------------------------------------------------------------------
|
| ルート側では EnsureFrontendRequestsAreStateful を重ねません。
| stateful 判定は Kernel の 'api' グループで実施され、ここでは
| auth:sanctum（＋必要なら独自ミドルウェア）のみを適用します。
|
*/
Route::middleware([
    'auth:sanctum',
    'check.user.active', // ユーザーアクティブ状態チェック
])->group(function () {

    // ログアウト
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('api.logout');

    // 認証済みユーザー情報取得
    Route::get('user', [AuthUserController::class, 'show']);

    // ユーザー一覧取得（アイコン情報含む）
    Route::get('users', [UserController::class, 'index']);

    // ユーザー個別の取得・更新（メール不使用、パスワードは別エンドポイント）
    Route::get('users/{user}', [UserController::class, 'show']);
    Route::put('users/{user}', [UserController::class, 'update']);               // JSON（画像なし）
    Route::post('users/{user}', [UserController::class, 'updateWithAvatar']);    // multipart（画像あり）
    Route::put('users/{user}/password', [UserController::class, 'updatePassword']); // 管理者のみ（対象はメンバー/マネージャー）
    Route::delete('users/{user}', [UserController::class, 'destroy']); // アカウント削除API追加

    // チャンネル一覧（権限に応じた結果のみ。resource より先に定義して上書き）
    Route::get('channels', [ChannelPrivacyController::class, 'index']);

    // 管理者向け統計
    Route::get('admin/stats', [AdminStatsController::class, 'index']);
    // チャンネル稼働率取得（メッセージ数ベース）
    Route::get('admin/channel-activity', [AdminStatsController::class, 'channelActivity']);
    // 運用率（日次%）
    Route::get('admin/utilization', [AdminStatsController::class, 'utilization']);

    // プライバシー設定（管理者/マネージャー）
    Route::get('channels/{channel}/members', [ChannelPrivacyController::class, 'members']);
    Route::put('channels/{channel}/privacy', [ChannelPrivacyController::class, 'updatePrivacy']);

    // チャンネル／メッセージ
    // 個別取得は閲覧可能性を検証
    Route::get('channels/{channel}', [ChannelController::class, 'show'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('channels', ChannelController::class);

    // メッセージAPIは閲覧可能性を検証
    Route::get('channels/{channel}/messages', [MessageController::class, 'index'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('messages', MessageController::class);
    // メッセージ更新
    Route::put('channels/{channel}/messages/{message}', [MessageController::class, 'update'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);

    // プロジェクト
    Route::get('projects', [ProjectController::class, 'index']);
    Route::post('projects', [ProjectController::class, 'store']);                // 作成
    Route::get('projects/{project}', [ProjectController::class, 'show']);        // 詳細
    Route::patch('projects/{project}', [ProjectController::class, 'update']);    // 更新
    Route::delete('projects/{project}', [ProjectController::class, 'destroy']);  // 削除

    Route::get('/projects/{project}/users', [ProjectUserController::class, 'index']);
    Route::post('/projects/{project}/users', [ProjectUserController::class, 'store']);
    Route::put('/projects/{project}/users/{user}', [ProjectUserController::class, 'update']);
    Route::delete('/projects/{project}/users/{user}', [ProjectUserController::class, 'destroy']);

    Route::get('/projects/{project}/files', [ProjectFileController::class, 'index']);
    Route::post('/projects/{project}/files', [ProjectFileController::class, 'store']);
    Route::delete('/projects/{project}/files/{file}', [ProjectFileController::class, 'destroy']);

    // タスク
    Route::apiResource('projects.tasks', TaskController::class);

    // プロジェクトチャット
    Route::get('/projects/{project}/chat', [ProjectChatController::class, 'show']);
    Route::post('/projects/{project}/chat/send', [ProjectChatController::class, 'send']);
});
