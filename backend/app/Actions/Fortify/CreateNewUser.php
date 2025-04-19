<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Illuminate\Validation\Rules\Password;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * バリデーションとユーザー作成を行う
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'user_id'   => ['required', 'string', 'max:255', 'unique:users,user_id'],
            'name'      => ['required', 'string', 'max:255'],
            'password'  => ['required', 'string', Password::defaults()],
        ])->validate();

        return User::create([
            'user_id'  => $input['user_id'],
            'name'     => $input['name'],
            'password' => Hash::make($input['password']),
        ]);
    }
}
