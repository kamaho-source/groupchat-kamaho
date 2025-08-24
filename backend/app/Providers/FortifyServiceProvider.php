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
            $user = \App\Models\User::where('user_id', $request->input(Fortify::username()))->first();

            if ($user && Hash::check($request->input('password'), $user->password)) {
                return $user;
            }

            // 認証に失敗した場合は null を返し、Fortify のパイプライン側でエラー処理させる
            return null;
        });

        // ユーザー登録ロジックを指定
        Fortify::createUsersUsing(CreateNewUser::class);
    }
}
