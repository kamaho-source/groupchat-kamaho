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

        $base = DB::table('channels')->select('id', 'name', 'is_private', 'posting_restricted')->orderBy('name');

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

        $ch = DB::table('channels')->where('id', $channelId)->first(['id', 'is_private', 'posting_restricted']);
        if (!$ch) abort(404);

        $memberIds = DB::table('channel_user')->where('channel_id', $channelId)->pluck('user_id')->all();

        return response()->json([
            'is_private' => (bool)$ch->is_private,
            'posting_restricted' => (bool)($ch->posting_restricted ?? false),
            'member_ids' => array_map('intval', $memberIds),
        ]);
    }

    // プライバシー設定の更新
    // - 管理者/マネージャー: 従来どおり更新可
    // - DMチャンネル（dm:<small>-<big>）: 当事者のどちらかで、かつ member_ids がその2名のみ・is_private=true の場合に限り一般ユーザーも更新可
    public function updatePrivacy(Request $request, $channelId): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) abort(401);

        $data = $request->validate([
            'is_private'  => ['required', 'boolean'],
            'member_ids'  => ['array'],
            'member_ids.*'=> ['integer', 'exists:users,id'],
            'posting_restricted' => ['sometimes', 'boolean'],
        ]);

        // 対象チャンネル取得（DM名判定用に name も取得）
        $ch = DB::table('channels')->where('id', $channelId)->first(['id', 'name']);
        if (!$ch) abort(404);

        $roleAllowed = in_array($actor->role ?? null, ['admin', 'manager'], true);

        // 非管理者の場合、DM 当事者のみの限定許可
        if (!$roleAllowed) {
            $isDm = false;
            $a = null; $b = null;
            if (is_string($ch->name) && preg_match('/^dm:(\d+)-(\d+)$/', $ch->name, $m)) {
                $x = (int)$m[1];
                $y = (int)$m[2];
                $a = min($x, $y);
                $b = max($x, $y);
                $isDm = true;
            }

            // DM ではない、または actor が当事者ではない → 拒否
            if (!$isDm || !in_array((int)$actor->id, [$a, $b], true)) {
                abort(403);
            }

            // DM は非公開固定、かつメンバーは当事者2名のみ
            $ids = array_map('intval', $data['member_ids'] ?? []);
            sort($ids);
            if (!$data['is_private'] || count($ids) !== 2 || $ids[0] !== $a || $ids[1] !== $b) {
                abort(403);
            }
        }

        $update = ['is_private' => $data['is_private'] ? 1 : 0];
        if ($roleAllowed && array_key_exists('posting_restricted', $data)) {
            $update['posting_restricted'] = $data['posting_restricted'] ? 1 : 0;
        }
        if (!$roleAllowed && array_key_exists('posting_restricted', $data)) {
            abort(403);
        }
        DB::table('channels')->where('id', $channelId)->update($update);

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
