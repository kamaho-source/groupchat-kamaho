<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthUserController extends Controller
{
    /**
     * GET /api/user
     * 認証済みユーザー情報を返す
     */
    public function show(Request $request): JsonResponse
    {
        \Log::info('api/user debug', [
            'has_session' => method_exists($request, 'hasSession') ? $request->hasSession() : null,
            'session_id'  => $request->session()->getId(),
            'cookies'     => $request->cookies->all(),
            'user'        => optional($request->user())->id,
            'guard_user'  => optional(auth('sanctum')->user())->id,
        ]);

        $user = $request->user();
        if (!$user) abort(401);

        return response()->json($user);
    }

}

