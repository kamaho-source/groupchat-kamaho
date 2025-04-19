<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->string('user'); // ユーザー名
            $table->text('content'); // メッセージ本文
            $table->foreignId('channel_id')->constrained('channels')->onDelete('cascade'); // 外部キー
            $table->timestamp('timestamp')->useCurrent(); // メッセージ送信時刻
            $table->timestamps(); // created_at / updated_at
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
