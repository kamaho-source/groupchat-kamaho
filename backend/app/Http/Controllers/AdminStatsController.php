<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Logファサードをインポート
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

    public function channelActivity(): JsonResponse
    {
        try {
            Log::info('Entering channelActivity method');

            // チャンネルごとのメッセージ数を取得
            $activityData = DB::table('channels')
                ->leftJoin('messages', 'channels.id', '=', 'messages.channel_id')
                ->select('channels.name as channel_name', DB::raw('COUNT(messages.id) as message_count'))
                ->groupBy('channels.id', 'channels.name')
                ->orderBy('message_count', 'desc')
                ->get();

            Log::info('Query executed successfully', ['data' => $activityData->toArray()]);

            // データを整形して返す
            $labels = $activityData->pluck('channel_name');
            $data = $activityData->pluck('message_count');

            return response()->json([
                'labels' => $labels,
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in channelActivity method', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // PHPのエラーログにも出力
            error_log('Error in channelActivity: ' . $e->getMessage());

            return response()->json([
                'error' => 'An error occurred while fetching channel activity data.'
            ], 500);
        }
    }
}
