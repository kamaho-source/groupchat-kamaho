<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use Illuminate\Http\Request;
use App\Models\Message;
use App\Events\MessageUpdated;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
    public function index($channelId)
    {
        $messages = Message::where('channel_id', $channelId)->orderBy('created_at')->get();

        return response()->json($messages);
    }

    public function store(Request $request, $channelId)
    {
        $validated = $request->validate([
            'user' => 'required|string|max:255',
            'content' => 'required|string',
            // max は KB 単位。1GB = 1024 * 1024 KB
            'file' => 'sometimes|file|max:1048576',
            'file_name' => 'sometimes|string|max:255',
            'mime_type' => 'sometimes|string|max:255',
        ]);

        $data = [
            'channel_id' => $channelId,
            'user' => $validated['user'],
            'content' => $validated['content'],
        ];

        // ファイルがある場合は保存してメタ情報を付与
        if ($request->hasFile('file')) {
            $storedPath = $request->file('file')->store('messages', 'public'); // storage/app/public/messages
            $data['file_path'] = $storedPath;
            $data['file_name'] = $request->input('file_name') ?? $request->file('file')->getClientOriginalName();
            $data['mime_type'] = $request->input('mime_type') ?? $request->file('file')->getMimeType();
        } else {
            // ファイルなしでも名前/タイプが来るケースに対応（任意）
            if ($request->filled('file_name')) {
                $data['file_name'] = $request->input('file_name');
            }
            if ($request->filled('mime_type')) {
                $data['mime_type'] = $request->input('mime_type');
            }
        }

        $message = Message::create($data);

        return response()->json($message->fresh(), 201);
    }

    public function update(Request $request, Channel $channel, Message $message)
    {
        // チャンネル & ユーザーの権限チェックを入れても良い
        $request->validate([
            'content' => 'required|string',
        ]);

        $message->content = $request->input('content');
        $message->save();
        $message->refresh();

        // ブロードキャストに失敗しても API を 500 にしない
        try {
            broadcast(new MessageUpdated($message));
        } catch (\Throwable $e) {
            Log::error('MessageUpdated broadcast failed', [
                'message_id' => $message->id,
                'channel_id' => $message->channel_id ?? null,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($message);
    }

}
