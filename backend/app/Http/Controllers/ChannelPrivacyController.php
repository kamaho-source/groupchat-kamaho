<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class ChannelPrivacyController extends Controller
{
    // 自分が見えるチャンネル一覧のみ返す（管理者/マネージャーは全件）
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) abort(401);

        $base = DB::table('channels')->select('id', 'name', 'is_private')->orderBy('name');

        $role = $user->role ?? null;
        if (!in_array($role, ['admin', 'manager'], true)) {
            $base->leftJoin('channel_user', 'channel_user.channel_id', '=', 'channels.id')
                ->where(function ($q) use ($user) {
                    $q->where('channels.is_private', false)
                      ->orWhere('channel_user.user_id', $user->id);
                })
                ->groupBy('channels.id', 'channels.name', 'channels.is_private');
        }

        $rows = $base->get();

        return response()->json($rows);
    }

    // メンバー一覧（idの配列）と is_private を返す（管理者/マネージャー専用）
    public function members(Request $request, $channelId): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) abort(401);
        if (!in_array($actor->role ?? null, ['admin', 'manager'], true)) abort(403);

        $ch = DB::table('channels')->where('id', $channelId)->first(['id', 'is_private']);
        if (!$ch) abort(404);

        $memberIds = DB::table('channel_user')->where('channel_id', $channelId)->pluck('user_id')->all();

        return response()->json([
            'is_private' => (bool)$ch->is_private,
            'member_ids' => array_map('intval', $memberIds),
        ]);
    }

    // プライバシー設定の更新（管理者/マネージャー専用）
    public function updatePrivacy(Request $request, $channelId): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) abort(401);
        if (!in_array($actor->role ?? null, ['admin', 'manager'], true)) abort(403);

        $data = $request->validate([
            'is_private'  => ['required', 'boolean'],
            'member_ids'  => ['array'],
            'member_ids.*'=> ['integer', 'exists:users,id'],
        ]);

        $ch = DB::table('channels')->where('id', $channelId)->first(['id']);
        if (!$ch) abort(404);

        DB::table('channels')->where('id', $channelId)->update(['is_private' => $data['is_private'] ? 1 : 0]);

        // メンバー更新（公開に戻す場合は全削除）
        DB::table('channel_user')->where('channel_id', $channelId)->delete();
        if ($data['is_private'] && !empty($data['member_ids'])) {
            $rows = array_map(function ($uid) use ($channelId) {
                return ['channel_id' => (int)$channelId, 'user_id' => (int)$uid];
            }, $data['member_ids']);
            DB::table('channel_user')->insert($rows);
        }

        return response()->json(['message' => 'updated']);
    }
}
