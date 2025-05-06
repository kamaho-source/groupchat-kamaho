<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * バリデーションとユーザー作成を行う
     */
    public function create(array $input): User
    {
        // 入力バリデーション（日本語メッセージ）
        Validator::make($input, [
            'user_id'  => ['required', 'string', 'max:255', 'unique:users,user_id'],
            'password' => ['required', 'string', Password::min(8)
                ->letters()->mixedCase()->numbers()->symbols(), 'confirmed'],
        ], [
            'user_id.required' => 'ユーザーIDは必須です。',
            'user_id.string'   => 'ユーザーIDは文字列である必要があります。',
            'user_id.max'      => 'ユーザーIDは255文字以内で入力してください。',
            'user_id.unique'   => 'このユーザーIDはすでに使用されています。',

            'password.required' => 'パスワードは必須です。',
            'password.string'   => 'パスワードは文字列である必要があります。',
            'password.min'      => 'パスワードは8文字以上で設定してください。',
            'password.confirmed'=> '確認用パスワードが一致しません。',
        ])->validate();

        // ユーザー作成
        return User::create([
            'name'     => $input['user_id'], // user_id を name として利用
            'user_id'  => $input['user_id'],
            'password' => Hash::make($input['password']),
        ]);
    }
}
