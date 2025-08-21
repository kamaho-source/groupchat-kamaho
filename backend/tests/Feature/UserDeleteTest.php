<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserDeleteTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_delete_user_and_record_deleted_users_row(): void
    {
        // マイグレーション実行
        $this->artisan('migrate', ['--force' => true]);

        // 管理者と対象ユーザーを作成
        $admin = User::factory()->create([
            'role' => 'admin',
            'user_id' => 'admin01',
            'name' => 'Admin',
            'password' => 'password1234',
        ]);
        $target = User::factory()->create([
            'role' => 'member',
            'user_id' => 'user05',
            'name' => 'Target User',
            'password' => 'password1234',
        ]);

        // Sanctum で認証
        Sanctum::actingAs($admin);

        // DELETE 実行
        $res = $this->deleteJson('/api/users/'.$target->id);
        $res->assertStatus(200)->assertJson(['message' => 'deleted']);

        // users テーブルから削除されている
        $this->assertDatabaseMissing('users', ['id' => $target->id]);
        // deleted_users に履歴が作成されている
        $this->assertDatabaseHas('deleted_users', [
            'user_id' => $target->id,
            'name' => 'Target User',
            'role' => 'member',
        ]);
    }
}

