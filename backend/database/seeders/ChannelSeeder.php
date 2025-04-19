<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Channel;

class ChannelSeeder extends Seeder
{
    public function run(): void
    {
        $channels = [
            ['name' => '全体連絡'],
            ['name' => '開発チーム'],
            ['name' => 'デザイン相談'],
            ['name' => 'ランチ会議'],
        ];

        foreach ($channels as $channel) {
            Channel::create($channel);
        }
    }
}
