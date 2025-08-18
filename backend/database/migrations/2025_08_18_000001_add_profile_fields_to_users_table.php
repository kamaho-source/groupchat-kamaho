<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 権限ロール（admin / manager / member / viewer）
            $table->string('role', 20)->default('member');
            // Material Icons 名（画像未使用時に表示するアイコン）
            $table->string('icon_name')->nullable();
            // ストレージ上のアバター画像パス（storage/app/public/...）
            $table->string('avatar_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'icon_name', 'avatar_path']);
        });
    }
};
