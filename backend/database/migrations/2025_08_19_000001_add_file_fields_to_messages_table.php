<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('file_path')->nullable()->after('content');
            $table->string('file_name')->nullable()->after('file_path');
            $table->string('mime_type')->nullable()->after('file_name');
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['file_path', 'file_name', 'mime_type']);
        });
    }
};
