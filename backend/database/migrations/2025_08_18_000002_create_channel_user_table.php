<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('channel_user')) {
            Schema::create('channel_user', function (Blueprint $table) {
                $table->unsignedBigInteger('channel_id');
                $table->unsignedBigInteger('user_id');
                $table->primary(['channel_id', 'user_id']);
                $table->foreign('channel_id')->references('id')->on('channels')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index('user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('channel_user');
    }
};
