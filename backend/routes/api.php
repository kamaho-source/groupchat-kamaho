<?php

use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
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

// 未認証 (CSRF + セッション開始 + Statefull) グループ
Route::middleware(['web', EnsureFrontendRequestsAreStateful::class])->group(function () {
    Route::post('login',    [AuthenticatedSessionController::class, 'store'])->name('login');
    Route::post('logout',   [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::post('register', [RegisteredUserController::class, 'store'])->name('register');
});

// 認証後 API
Route::middleware(['web', EnsureFrontendRequestsAreStateful::class, 'auth:sanctum'])->group(function () {
    Route::get('user', [AuthUserController::class, 'show']);

    // Users
    Route::get('users', [UserController::class, 'index']);
    Route::get('users/{user}', [UserController::class, 'show']);
    Route::put('users/{user}', [UserController::class, 'update']);
    Route::post('users/{user}', [UserController::class, 'updateWithAvatar']);
    Route::put('users/{user}/password', [UserController::class, 'updatePassword']);
    Route::delete('users/{user}', [UserController::class, 'destroy']);

    // Channels
    Route::get('channels', [ChannelPrivacyController::class, 'index']);
    Route::get('channels/{channel}', [ChannelController::class, 'show'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('channels', ChannelController::class);

    // Messages
    Route::get('channels/{channel}/messages', [MessageController::class, 'index'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::post('channels/{channel}/messages', [MessageController::class, 'store'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::put('channels/{channel}/messages/{message}', [MessageController::class, 'update'])
        ->middleware(\App\Http\Middleware\EnsureChannelViewable::class);
    Route::apiResource('messages', MessageController::class);

    // Projects
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

    // Project Chat
    Route::get ('projects/{project}/chat', [ProjectChatController::class, 'show']);
    Route::post('projects/{project}/chat/send', [ProjectChatController::class, 'send']);

    // Nested tasks
    Route::apiResource('projects.tasks', TaskController::class);
});

