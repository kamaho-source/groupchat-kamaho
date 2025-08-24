<?php

namespace App\Actions\Fortify;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create an HTTP response that represents the object.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function toResponse($request)
    {
        $user = auth()->user();

        return new JsonResponse([
            'message' => 'ログインに成功しました',
            'user' => [
                'id' => $user->id,
                'user_id' => $user->user_id,
                'name' => $user->name,
                'role' => $user->role,
                'icon_name' => $user->icon_name,
                'avatar_path' => $user->avatar_path,
            ],
            'authenticated' => true,
        ], 200);
    }
}
