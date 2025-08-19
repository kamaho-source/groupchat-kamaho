<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AdminStatsController extends Controller
{
    public function index(): JsonResponse
    {
        $users = DB::table('users')->count();
        $channels = DB::table('channels')->count();
        $privateChannels = DB::table('channels')->where('is_private', true)->count();
        $messages = DB::table('messages')->count();

        $today = Carbon::today();
        $messagesToday = DB::table('messages')
            ->where('created_at', '>=', $today)
            ->count();

        return response()->json([
            'users_count' => $users,
            'channels_count' => $channels,
            'private_channels_count' => $privateChannels,
            'messages_count' => $messages,
            'messages_today' => $messagesToday,
            'generated_at' => now()->toISOString(),
        ]);
    }
}
