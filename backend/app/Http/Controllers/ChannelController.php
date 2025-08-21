<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Channel;
use App\Models\Message;
use Illuminate\Support\Facades\DB;

class ChannelController extends Controller
{
    /**
     * チャンネル一覧取得
     */
    public function index(Request $request)
    {
        $channels = Channel::all();
        return response()->json($channels);
    }
    /**
     * チャンネルの新規作成
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $channel = Channel::create($validated);

        return response()->json($channel, 201);
    }

    /**
     * 指定IDのチャンネル取得
     */
    public function show(Request $request, $id)
    {
        if (!$this->canView($request, (int)$id)) {
            return response()->json(['message' => 'あなたには閲覧権限がありません'], 403);
        }
        $channel = Channel::findOrFail($id);
        return response()->json($channel);
    }

    /**
     * チャンネルの更新
     */
    public function update(Request $request, $id)
    {
        $channel = Channel::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $channel->update($validated);

        return response()->json($channel);
    }

    /**
     * チャンネルの削除
     */
    public function destroy($id)
    {
        $channel = Channel::findOrFail($id);
        $channel->delete();

        return response()->json(['message' => 'Channel deleted']);
    }

    private function canView(Request $request, int $channelId): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }
        $role = $user->role ?? null;
        if (in_array($role, ['admin', 'manager'], true)) {
            return true;
        }
        $isPrivate = (bool) DB::table('channels')->where('id', $channelId)->value('is_private');
        if (!$isPrivate) {
            return true;
        }
        return DB::table('channel_user')
            ->where('channel_id', $channelId)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function messages($id)
    {
        $channel = Channel::findOrFail($id);
        $messages = Message::where('channel_id', $channel->id)->orderBy('created_at')->get();

        return response()->json($messages);
    }
}
