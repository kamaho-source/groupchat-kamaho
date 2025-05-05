<?php

namespace App\Actions\Fortify;

use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Handle the successful login response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return mixed
     */
    public function toResponse($request)
    {
        // 認証済みユーザー
        $user = $request->user();

        // Sanctum パーソナルアクセストークンを発行
        $token = $user->createToken('api-token')->plainTextToken;

        // JSON リクエストなら JSON で返す
        if ($request->wantsJson()) {
            return response()->json([
                'user'  => $user,
                'token' => $token,
            ], 200);
        }

        // それ以外はデフォルトのリダイレクト
        return redirect()->intended(config('fortify.home'));
    }
}
