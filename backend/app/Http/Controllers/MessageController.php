<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Message;

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
        ]);

        $message = Message::create([
            'channel_id' => $channelId,
            'user' => $validated['user'],
            'content' => $validated['content'],
        ]);

        return response()->json($message, 201);
    }
}
