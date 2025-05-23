<?php

// database/migrations/xxxx_xx_xx_make_channel_id_nullable_on_projects_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::table('projects', function (Blueprint $table) {
            // 外部キーを一度ドロップしてから、nullable に変更
            $table->dropForeign(['channel_id']);
            $table->unsignedBigInteger('channel_id')->nullable()->change();
            $table->foreign('channel_id')
                ->references('id')->on('channels')
                ->cascadeOnDelete();
        });
    }

    public function down()
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['channel_id']);
            $table->unsignedBigInteger('channel_id')->nullable(false)->change();
            $table->foreign('channel_id')
                ->references('id')->on('channels')
                ->cascadeOnDelete();
        });
    }
};
