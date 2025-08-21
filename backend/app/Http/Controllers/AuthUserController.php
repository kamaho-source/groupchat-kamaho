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
        $user = $request->user();
        if (!$user) {
            abort(401);
        }
        return response()->json($user);
    }
}

