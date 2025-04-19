<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // CreatesNewUsers は CreateNewUser クラスにバインド
        $this->app->singleton(
            \Laravel\Fortify\Contracts\CreatesNewUsers::class,
            CreateNewUser::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // ユーザー登録や更新系は既存のアクションを利用
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);

        // ログインに使うフィールドを 'user_id' に変更
        Fortify::username('user_id');

        // カスタム認証ロジック
        Fortify::authenticateUsing(function (Request $request) {
            // 'user_id' を文字列として検証
            $request->validate([
                'user_id'  => ['required', 'string'],
                'password' => ['required', 'string'],
            ]);

            // user_id カラムでユーザーを検索
            $user = User::where('user_id', $request->input('user_id'))->first();

            // パスワード照合
            if ($user && Hash::check($request->input('password'), $user->password)) {
                return $user;
            }

            return null;
        });

        // ログイン試行のレートリミット設定
        RateLimiter::for('login', function (Request $request) {
            $key = Str::transliterate(Str::lower($request->input('user_id')).'|'.$request->ip());
            return Limit::perMinute(5)->by($key);
        });

        // 二段階認証のレートリミット設定
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });
    }
}
