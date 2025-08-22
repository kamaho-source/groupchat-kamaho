<?php
// app/Providers/FortifyServiceProvider.php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Laravel\Fortify\Fortify;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // カスタム JSON LoginResponse をバインド
        $this->app->bind(LoginResponse::class, \App\Http\Responses\LoginResponse::class);
        $this->app->singleton(CreatesNewUsers::class, CreateNewUser::class);
    }

    public function boot(): void
    {
        Fortify::username('user_id');
        // 標準ルート無効化（自前 api.php で定義）
        Fortify::ignoreRoutes();

        Fortify::authenticateUsing(function (Request $request) {
            $credentials = $request->only('user_id', 'password');
            $key = 'login-attempts-'.$request->user_id;

            if (RateLimiter::tooManyAttempts($key, 5)) {
                $seconds = RateLimiter::availableIn($key);
                throw ValidationException::withMessages([
                    'user_id' => ["多く失敗したため {$seconds} 秒後に再試行してください。"],
                ]);
            }

            if (Auth::attempt($credentials)) {
                RateLimiter::clear($key);
                return Auth::user();
            }

            RateLimiter::hit($key);
            throw ValidationException::withMessages([
                'user_id' => ['ログインIDまたはパスワードが正しくありません。'],
            ]);
        });

        Fortify::createUsersUsing(CreateNewUser::class);
    }
}
