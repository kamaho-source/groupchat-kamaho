<?php

namespace App\Http\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    /**
     * 新規ユーザー登録（API）
     */
    public function register(Request $request)
    {
        // バリデーション
        $data = $request->validate([
            'login_id' => ['required','string','max:50','unique:users,login_id'],
            'name'     => ['required','string','max:255'],
            'password' => ['required','string','min:6'],
        ]);

        // ユーザー作成
        $user = User::create([
            'login_id' => $data['login_id'],
            'name'     => $data['name'],
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'user' => $user,
        ], 201);
    }
}
