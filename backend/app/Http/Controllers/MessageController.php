<?php

namespace App\Http\Controllers;

use App\Models\Channel;
use Illuminate\Http\Request;
use App\Models\Message;
use App\Events\MessageUpdated;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    private function isAiMentioned(string $content): bool
    {
        return (bool) preg_match('/(^|[\\s,、。!！?？:：;；()（）\\[\\]{}\"\\\'`])[@＠]AI(?![\\w-])/iu', $content);
    }

    private function buildAiPrompt(string $content): ?string
    {
        if (!$this->isAiMentioned($content)) {
            return null;
        }
        $clean = preg_replace('/[@＠]AI/iu', '', $content);
        $prompt = trim($clean ?? '');
        return $prompt !== '' ? $prompt : '挨拶してください。';
    }

    private function callOpenRouter(string $prompt, ?string $userName = null): ?string
    {
        $apiKey = env('OPENROUTER_API_KEY');
        if (!$apiKey) {
            return null;
        }

        $system = env(
            'OPENROUTER_SYSTEM_PROMPT',
            'あなたは鎌倉児童ホームのチャットAIアシスタントです。日本語で簡潔に答えてください。'
        );

        $baseUri = env('OPENROUTER_API_BASE', 'openrouter.ai/api/v1');
        $siteUrl = env('OPENROUTER_SITE_URL', env('APP_URL'));
        $siteTitle = env('OPENROUTER_SITE_TITLE', 'Kamaho Chat');
        $model = env('OPENROUTER_MODEL', 'openai/gpt-4o-mini');

        $client = \OpenAI::factory()
            ->withApiKey($apiKey)
            ->withBaseUri($baseUri)
            ->withHttpHeader('HTTP-Referer', (string) $siteUrl)
            ->withHttpHeader('X-Title', (string) $siteTitle)
            ->make();

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $prompt],
        ];
        if ($userName) {
            $messages[1]['name'] = $userName;
        }

        try {
            $response = $client->chat()->create([
                'model' => $model,
                'messages' => $messages,
            ]);
        } catch (\Throwable $e) {
            Log::error('OpenRouter request failed', ['error' => $e->getMessage()]);
            return null;
        }

        $content = $response->choices[0]->message->content ?? null;
        return is_string($content) && trim($content) !== '' ? trim($content) : null;
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

    private function canPost(Request $request, int $channelId): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }
        $role = $user->role ?? null;
        if (in_array($role, ['admin', 'manager'], true)) {
            return true;
        }
        $restricted = (bool) DB::table('channels')->where('id', $channelId)->value('posting_restricted');
        return !$restricted;
    }

    public function index($channelId)
    {
        // ミドルウェアに加えて二重チェック（安全側）
        if (!request()->user() || !$this->canView(request(), (int)$channelId)) {
            return response()->json(['message' => 'あなたには閲覧権限がありません'], 403);
        }

        $messages = Message::where('channel_id', $channelId)->orderBy('created_at')->get();

        return response()->json($messages);
    }

    public function store(Request $request, $channelId)
    {
        if (!$this->canView($request, (int)$channelId)) {
            return response()->json(['message' => 'あなたには閲覧権限がありません'], 403);
        }
        if (!$this->canPost($request, (int)$channelId)) {
            return response()->json(['message' => 'このチャンネルは投稿が制限されています'], 403);
        }

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

        // @AI メンションが含まれていれば AI 返信を自動投稿
        $aiPrompt = $this->buildAiPrompt($validated['content']);
        $senderName = $validated['user'] ?? null;
        if ($aiPrompt && strcasecmp((string) $senderName, 'AI') !== 0) {
            $aiText = $this->callOpenRouter($aiPrompt, $senderName);
            if ($aiText) {
                Message::create([
                    'channel_id' => $channelId,
                    'user' => 'AI',
                    'content' => $aiText,
                ]);
            }
        }

        return response()->json($message->fresh(), 201);
    }

    public function update(Request $request, Channel $channel, Message $message)
    {
        if (!$this->canView($request, (int)$channel->id)) {
            return response()->json(['message' => 'あなたには閲覧権限がありません'], 403);
        }
        if (!$this->canPost($request, (int)$channel->id)) {
            return response()->json(['message' => 'このチャンネルは投稿が制限されています'], 403);
        }

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
