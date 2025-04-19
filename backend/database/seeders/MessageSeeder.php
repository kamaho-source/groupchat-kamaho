<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Message;

class MessageSeeder extends Seeder
{
    public function run(): void
    {
        $messages = [
            [
                'user' => '山田太郎',
                'content' => 'おはようございます！今日の会議は何時からですか？',
                'channel_id' => 1,
                'timestamp' => now(),
            ],
            [
                'user' => '佐藤花子',
                'content' => '10時からの予定です。会議室Bに集合しましょう。',
                'channel_id' => 1,
                'timestamp' => now(),
            ],
            [
                'user' => '田中一郎',
                'content' => '資料をアップロードしました。ご確認ください。',
                'channel_id' => 2,
                'timestamp' => now(),
            ],
            [
                'user' => '山田太郎',
                'content' => 'ありがとうございます！助かります。',
                'channel_id' => 2,
                'timestamp' => now(),
            ],
        ];

        foreach ($messages as $message) {
            Message::create($message);
        }
    }
}
