<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/register
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required','string','min:3','max:50','alpha_dash','unique:users,user_id'],
            'name'    => ['required','string','max:100'],
            'password' => ['required','string','min:8','confirmed'], // password_confirmation 必須
        ]);

        // password は casts で hashed なのでそのまま代入でOK
        $user = User::create([
            'user_id' => $data['user_id'],
            'name'    => $data['name'],
            'password'=> $data['password'],
            'role'    => 'member',
            'is_active' => 1,
        ]);

        // 自動ログイン
        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
        ], 201);
    }

    /**
     * POST /api/login
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'user_id' => ['required','string'],
            'password'=> ['required','string'],
        ]);

        // まずユーザーが存在するかチェック
        $user = User::where('user_id', $credentials['user_id'])->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'user_id' => ['ユーザーIDまたはパスワードが正しくありません。'],
            ]);
        }

        // パスワードをチェック
        if (!Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'user_id' => ['ユーザーIDまたはパスワードが正しくありません。'],
            ]);
        }

        // アカウントがアクティブかどうかをチェック
        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'user_id' => ['アカウント停止状態なのでログインできません。管理者にお問い合わせください。'],
            ]);
        }

        // 認証成功
        Auth::login($user, true);
        //$request->session()->regenerate();

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
        ], 200);
    }

    /**
     * POST /api/logout
     */
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->noContent(); // 204
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'user_id' => $user->user_id,
            'name' => $user->name,
            'role' => $user->role,
            'avatar_path' => $user->avatar_path,
        ];
    }
}
