<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Message $message)
    {
        //
    }

    public function broadcastOn(): array
    {
        // 公開チャンネル: channel.{channel_id}
        return [new Channel('channel.' . $this->message->channel_id)];
    }

    public function broadcastAs(): string
    {
        return 'MessageUpdated';
    }

    public function broadcastWith(): array
    {
        // 更新済みメッセージの値をそのまま送る
        return $this->message->toArray();
    }
}
