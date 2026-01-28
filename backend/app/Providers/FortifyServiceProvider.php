<?php
// app/Providers/FortifyServiceProvider.php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Fortify\Fortify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use App\Actions\Fortify\LoginResponse;
use Illuminate\Validation\ValidationException;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // ユーザー作成の契約に実装をバインド
        $this->app->singleton(CreatesNewUsers::class, CreateNewUser::class);

        // カスタムログインレスポンス
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
    }

    public function boot(): void
    {
        // Fortifyのビューベースルートを無効化（APIのみ使用）
        Fortify::ignoreRoutes();

        // 認証フィールドを user_id に
        Fortify::username('user_id');

        // カスタム認証ロジック
        Fortify::authenticateUsing(function (Request $request) {
            $request->validate(
                [
                    'user_id' => ['required', 'string'],
                    'password' => ['required', 'string'],
                ],
                [
                    'user_id.required' => 'ユーザーIDを入力してください。',
                    'password.required' => 'パスワードを入力してください。',
                ]
            );

            $user = \App\Models\User::where('user_id', $request->input(Fortify::username()))->first();

            if (!$user || !Hash::check($request->input('password'), $user->password)) {
                throw ValidationException::withMessages([
                    'user_id' => ['パスワードかユーザ名が間違っています。'],
                ]);
            }

            // is_activeが0の場合、アカウント停止エラーをスロー
            if (!$user->is_active) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'user_id' => ['アカウント停止状態なのでログインできません。管理者にお問い合わせください。'],
                ]);
            }
            return $user;
        });

        // ユーザー登録ロジックを指定
        Fortify::createUsersUsing(CreateNewUser::class);
    }
}
