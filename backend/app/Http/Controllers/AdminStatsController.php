<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Logファサードをインポート
use Carbon\Carbon;

class AdminStatsController extends Controller
{
    private function assertAdmin(): void
    {
        $user = auth()->user();
        if (!$user || ($user->role ?? null) !== 'admin') {
            abort(403, 'Admin only');
        }
    }

    public function index(): JsonResponse
    {
        $this->assertAdmin();

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
        $this->assertAdmin();
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

    // 運用率（日次: 全チャンネルのうち当日に1件以上メッセージがあった割合[%]）
    public function utilization(): JsonResponse
    {
        $this->assertAdmin();
        try {
            // 直近30日をデフォルト
            $days = 30;

            $rows = DB::select(<<<SQL
WITH RECURSIVE dates AS (
    SELECT CURDATE() - INTERVAL ? - 1 DAY AS d
    UNION ALL
    SELECT d + INTERVAL 1 DAY FROM dates WHERE d + INTERVAL 1 DAY <= CURDATE()
),
msg AS (
    SELECT DATE(created_at) AS d, COUNT(DISTINCT channel_id) AS active_channels
    FROM messages
    WHERE created_at >= CURDATE() - INTERVAL ? - 1 DAY
    GROUP BY DATE(created_at)
),
ch_total AS (
    SELECT COUNT(*) AS total_channels FROM channels
)
SELECT DATE_FORMAT(dates.d, '%Y-%m-%d') AS date,
       COALESCE(msg.active_channels, 0) AS active_channels,
       ch_total.total_channels AS total_channels,
       CASE WHEN ch_total.total_channels = 0 THEN 0
            ELSE ROUND(COALESCE(msg.active_channels,0) / ch_total.total_channels * 100, 2)
       END AS utilization
FROM dates
CROSS JOIN ch_total
LEFT JOIN msg ON msg.d = dates.d
ORDER BY dates.d
SQL, [$days, $days]);

            $labels = array_map(fn($r) => $r->date, $rows);
            $data = array_map(fn($r) => (float)$r->utilization, $rows);

            return response()->json([
                'labels' => $labels,
                'data' => $data,
                'unit' => 'percent',
                'description' => '各日: メッセージのあったチャンネル数 / 総チャンネル数 * 100',
            ]);
        } catch (\Exception $e) {
            Log::error('Error in utilization method', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'error' => 'Failed to compute utilization.'
            ], 500);
        }
    }
}
