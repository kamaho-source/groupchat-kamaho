<?php

namespace App\Http\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    /**
     * ログイン処理（API）
     */
    public function login(Request $request)
    {
        // バリデーション
        $credentials = $request->validate([
            'login_id' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        // 認証試行
        if (!Auth::attempt($credentials)) {
            return response()->json([
                'message' => '認証に失敗しました。',
            ], 422);
        }

        // セッション再生成（CSRF 対策）
        $request->session()->regenerate();

        // 認証ユーザーを取得
        $user = Auth::user();

        return response()->json([
            'user' => $user,
        ], 200);
    }

    /**
     * ログアウト処理（API）
     */
    public function logout(Request $request)
    {
        Auth::logout();

        // セッション破棄／再生成
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'ログアウトしました。',
        ], 200);
    }
}
