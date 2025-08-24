<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'user_id' => ['required', 'string', 'min:3', 'max:50', 'alpha_dash', 'unique:users,user_id'],
            'name' => ['required', 'string', 'max:100'],
            'password' => $this->passwordRules(),
        ])->validate();

        return User::create([
            'user_id' => $input['user_id'],
            'name' => $input['name'],
            'password' => Hash::make($input['password']),
            'role' => 'member',
            'is_active' => 1, // デフォルトでアクティブに設定
        ]);
    }
}
