<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            if (!Schema::hasColumn('channels', 'is_private')) {
                $table->boolean('is_private')->default(false)->after('name')->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('channels', function (Blueprint $table) {
            if (Schema::hasColumn('channels', 'is_private')) {
                $table->dropColumn('is_private');
            }
        });
    }
};
