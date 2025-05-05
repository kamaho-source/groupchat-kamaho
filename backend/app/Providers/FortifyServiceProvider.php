<?php
// app/Providers/FortifyServiceProvider.php

namespace App\Providers;

use App\Actions\Fortify\LoginResponse as LoginResponseContract;
use App\Actions\Fortify\CreateNewUser;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Laravel\Fortify\Fortify;
use Illuminate\Http\Request;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // ログインレスポンスをオーバーライド
        $this->app->instance(LoginResponse::class, new class extends LoginResponseContract {
            public function toResponse($request)
            {
                $user = Auth::user();

                // セッション Cookie を再発行
                $sessionId = $request->session()->getId();
                Cookie::queue(
                    Cookie::make(
                        config('session.cookie'),
                        $sessionId,
                        config('session.lifetime'),
                        config('session.path'),
                        config('session.domain'),
                        config('session.secure'),
                        true,
                        false,
                        config('session.same_site')
                    )
                );

                // Sanctum トークンを発行
                $plainToken = $user->createToken('api-token')->plainTextToken;

                return response()->json([
                    'login' => true,
                    'user'  => [
                        'id'      => $user->id,
                        'user_id' => $user->user_id,
                        'name'    => $user->name,
                    ],
                    'token' => $plainToken,
                ], 200);
            }
        });

        // ユーザー作成の契約に実装をバインド
        $this->app->singleton(CreatesNewUsers::class, CreateNewUser::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 認証フィールドを user_id に
        Fortify::username('user_id');

        // Fortify の標準ルートを無効化
        Fortify::ignoreRoutes();

        // カスタム認証ロジック
        Fortify::authenticateUsing(function (Request $request) {
            $credentials = $request->only('user_id', 'password');
            return Auth::attempt($credentials) ? Auth::user() : null;
        });

        // ユーザー登録ロジックを指定
        Fortify::createUsersUsing(CreateNewUser::class);
    }
}
