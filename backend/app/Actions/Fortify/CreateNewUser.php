<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * バリデーションとユーザー作成を行う
     */
    public function create(array $input): User
    {
        // 入力バリデーション（子供向けの分かりやすいメッセージ）
        Validator::make($input, [
            'user_id'  => ['required', 'string', 'max:20', 'unique:users,user_id'],
            'password' => [
                'required',
                'string',
                'min:4',
                'regex:/^[A-Za-z]+$/',
                'confirmed'
            ],
        ], [
            'user_id.required' => 'ログインIDを入力してね！',
            'user_id.string'   => 'ログインIDは文字で入力してね！',
            'user_id.max'      => 'ログインIDは20文字までだよ！',
            'user_id.unique'   => 'このログインIDは使われているよ！別のを考えてね。',

            'password.required' => 'パスワードを入力してね！',
            'password.string'   => 'パスワードは文字で入力してね！',
            'password.min'      => 'パスワードは4文字以上で入力してね！',
            'password.regex'    => 'パスワードは英文字（A-Z, a-z）だけを使ってね！',
            'password.confirmed'=> '確認用パスワードが違うよ！もう一度入力してね。',
        ])->validate();

        // ユーザー作成
        return User::create([
            'name'     => $input['user_id'], // user_id を name として利用
            'user_id'  => $input['user_id'],
            'password' => Hash::make($input['password']),
        ]);
    }
}
