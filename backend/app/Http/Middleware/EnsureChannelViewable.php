<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EnsureChannelViewable
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        $routeParam = $request->route('channel');
        $channelId = is_object($routeParam) ? ($routeParam->id ?? null) : (is_numeric($routeParam) ? (int) $routeParam : null);
        if (!$channelId) {
            return $next($request);
        }

        $channel = DB::table('channels')->where('id', $channelId)->first(['id', 'is_private']);
        if (!$channel) {
            abort(404);
        }

        if (!$channel->is_private) {
            return $next($request);
        }

        // 管理者/マネージャーは常に許可
        $role = $user->role ?? null;
        if (in_array($role, ['admin', 'manager'], true)) {
            return $next($request);
        }

        $allowed = DB::table('channel_user')
            ->where('channel_id', $channelId)
            ->where('user_id', $user->id)
            ->exists();

        if (!$allowed) {
            abort(403, 'このチャンネルを閲覧する権限がありません。');
        }

        return $next($request);
    }
}
