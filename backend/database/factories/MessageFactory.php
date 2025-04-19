<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Channel;

class MessageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user' => $this->faker->name(),
            'content' => $this->faker->sentence(),
            'channel_id' => Channel::factory(),
            'timestamp' => now(),
        ];
    }
}
