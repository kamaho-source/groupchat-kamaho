<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\DeletedUser;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Schema; // 追加
use Illuminate\Support\Facades\Log;    // 追加

class UserController extends Controller
{
    /**
     * GET /api/users/{user}
     * 本人または管理者/マネージャーのみ閲覧可
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401);
        }
        if ($actor->id !== $user->id && !$this->isAdminOrManager($actor)) {
            abort(403, '閲覧権限がありません');
        }

        return response()->json([
            'id'         => (string) $user->id,
            'user_id'    => $user->user_id,
            'name'       => $user->name,
            'role'       => $user->role,
            'icon_name'  => $user->icon_name,
            'avatar_url' => $user->avatar_path
                ? Storage::disk('public')->url($user->avatar_path) . '?v=' . ($user->updated_at?->timestamp ?? time())
                : null,
        ]);
    }

    /**
     * PUT /api/users/{user}
     * JSON更新（画像なし）。本人は name/icon のみ、管理者/マネージャーは role も変更可。
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401);
        }
        // 本人か、または管理者/マネージャーであれば更新可能
        if ($actor->id !== $user->id && !$this->isAdminOrManager($actor)) {
            abort(403, '更新権限がありません');
        }

        $data = $request->validate([
            'name'      => ['nullable', 'string', 'max:255', 'required_without:is_active'],
            'is_active' => ['nullable', 'boolean', 'required_without:name'],
            'role'      => ['nullable', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            'icon_name' => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('name', $data)) {
            $user->name = $data['name'];
        }

        // role は管理者のみ変更可（リクエストに role があって権限がない場合は明示的に403）
        if ($request->exists('role') && !$this->isAdmin($actor)) {
            abort(403, 'ロール変更権限がありません');
        }
        if (array_key_exists('role', $data) && $this->isAdmin($actor)) {
            $user->role = $data['role'] ?? $user->role;
        }

        // is_active は管理者のみ変更可
        if ($request->exists('is_active') && !$this->isAdmin($actor)) {
            abort(403, 'アクティブ状態変更権限がありません');
        }
        if (array_key_exists('is_active', $data) && $this->isAdmin($actor)) {
            $user->is_active = $data['is_active'];
        }

        // icon_name が送られてきた場合：画像を解除してアイコンに切替（null も許可）
        if ($request->exists('icon_name')) {
            $user->icon_name = $data['icon_name'] ?: null;

            // 旧来の単一パスを削除
            if (!empty($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            // ユーザー用ディレクトリ配下を掃除（avatars/{id}）
            $dir = 'avatars/' . $user->id;
            if (Storage::disk('public')->exists($dir)) {
                foreach (Storage::disk('public')->files($dir) as $f) {
                    Storage::disk('public')->delete($f);
                }
            }

            $user->avatar_path = null;
        }

        $user->save();

        return response()->json([
            'message' => 'updated',
            'user' => [
                'id'         => (string) $user->id,
                'user_id'    => $user->user_id,
                'name'       => $user->name,
                'role'       => $user->role,
                'icon_name'  => $user->icon_name,
                'avatar_url' => $user->avatar_path
                    ? Storage::disk('public')->url($user->avatar_path) . '?v=' . ($user->updated_at?->timestamp ?? time())
                    : null,
            ],
        ]);
    }

    /**
     * POST /api/users/{user}
     * multipart 更新（画像あり）。本人または管理者/マネージャー。
     * 画像をアップした場合は icon_name をクリア。
     */
    public function updateWithAvatar(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401);
        }
        if ($actor->id !== $user->id && !$this->isAdminOrManager($actor)) {
            abort(403, '更新権限がありません');
        }

        $data = $request->validate([
            'name'   => ['required', 'string', 'max:255'],
            'role'   => ['nullable', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            'avatar' => ['required', 'file', 'image', 'max:5120'], // 5MB
        ]);

        $user->name = $data['name'];

        // role は管理者/マネージャーのみ変更可（リクエストに role があって権限がない場合は明示的に403）
        if ($request->exists('role') && !$this->isAdmin($actor)) {
            abort(403, 'ロール変更権限がありません');
        }
        if (array_key_exists('role', $data) && $this->isAdmin($actor)) {
            $user->role = $data['role'] ?? $user->role;
        }

        // 古い画像を削除（既存の保存パスがあれば削除）
        if (!empty($user->avatar_path)) {
            Storage::disk('public')->delete($user->avatar_path);
        }
        // 拡張子違いも含めて、このユーザーの既存アバターを掃除
        $base = 'user-' . $user->id;
        foreach (['jpg','jpeg','png','gif','webp','bmp'] as $e) {
            $old = "avatars/{$base}.{$e}";
            if (Storage::disk('public')->exists($old)) {
                Storage::disk('public')->delete($old);
            }
        }

        // 新しいファイル名を user-{id}.{ext} に固定して保存
        $ext = strtolower($request->file('avatar')->getClientOriginalExtension() ?: $request->file('avatar')->extension() ?: 'jpg');
        $filename = "{$base}.{$ext}";
        $request->file('avatar')->storeAs('avatars', $filename, 'public');
        $user->avatar_path = "avatars/{$filename}";
        // 画像優先
        $user->icon_name = null;

        $user->save();

        return response()->json([
            'message' => 'updated',
            'user' => [
                'id'         => (string) $user->id,
                'user_id'    => $user->user_id,
                'name'       => $user->name,
                'role'       => $user->role,
                'icon_name'  => $user->icon_name,
                'avatar_url' => $user->avatar_path
                    ? Storage::disk('public')->url($user->avatar_path) . '?v=' . ($user->updated_at?->timestamp ?? time())
                    : null,
            ],
        ]);
    }

    /**
     * PUT /api/users/{user}/password
     * 管理者のみ、対象がメンバーまたはマネージャーの場合にパスワードを更新。
     */
    public function updatePassword(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401);
        }
        // 管理者またはマネージャーのみ許可
        if (!$this->isAdminOrManager($actor)) {
            abort(403, 'パスワード更新権限がありません');
        }
        // 対象はメンバー/マネージャーに限定（管理者のパスワードは変更不可）
        if (!in_array($user->role, ['member', 'manager'], true)) {
            abort(403, 'このユーザーのパスワードは変更できません');
        }

        $data = $request->validate([
            'new_password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $user->password = Hash::make($data['new_password']);
        $user->save();

        return response()->json([
            'message' => 'password_updated',
        ]);
    }

    /**
     * GET /api/users
     * 全ユーザー一覧（最小限のプロフィール）を返す
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorizeList($request->user());

        $users = User::query()
            ->select(['id', 'user_id', 'name', 'role', 'icon_name', 'avatar_path', 'is_active', 'updated_at'])
            ->orderBy('name')
            ->get()
            ->map(function (User $u) {
                return [
                    'id'         => (string) $u->id,
                    'user_id'    => $u->user_id,
                    'name'       => $u->name,
                    'role'       => $u->role,
                    'icon_name'  => $u->icon_name,
                    'avatar_url' => $u->avatar_path
                        ? Storage::disk('public')->url($u->avatar_path) . '?v=' . ($u->updated_at?->timestamp ?? time())
                        : null,
                    'is_active'  => $u->is_active,
                ];
            });

        return response()->json($users);
    }

    /**
     * PUT /api/users/{user}/deactivate
     * アカウント停止
     */
    public function deactivate(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor || !$this->isAdminOrManager($actor)) {
            abort(403, '権限がありません');
        }
        $user->is_active = false;
        $user->save();
        return response()->json(['message' => 'deactivated']);
    }

    /**
     * PUT /api/users/{user}/activate
     * アカウント再開
     */
    public function activate(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor || !$this->isAdminOrManager($actor)) {
            abort(403, '権限がありません');
        }
        $user->is_active = true;
        $user->save();
        return response()->json(['message' => 'activated']);
    }

    /**
     * DELETE /api/users/{user}
     * アカウント削除
     */
    public function destroy(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor || !$this->isAdminOrManager($actor)) {
            abort(403, '権限がありません');
        }

        // 削除前に履歴保存（テーブルが存在する場合のみ）
        try {
            if (Schema::hasTable('deleted_users')) {
                DeletedUser::create([
                    'user_id'    => $user->id,
                    'name'       => $user->name,
                    'role'       => $user->role,
                    'email'      => $user->email ?? null,
                    'deleted_at' => now(),
                ]);
            } else {
                Log::warning('deleted_users table not found; skipping audit log on user delete', [
                    'target_user_id' => $user->id,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Failed to insert into deleted_users', [
                'error' => $e->getMessage(),
                'target_user_id' => $user->id,
            ]);
            // 履歴保存に失敗しても削除自体は続行
        }

        // 関連ファイルの掃除（アバター）
        try {
            if (!empty($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
            }
            $dir = 'avatars/' . $user->id;
            if (Storage::disk('public')->exists($dir)) {
                foreach (Storage::disk('public')->files($dir) as $f) {
                    Storage::disk('public')->delete($f);
                }
                foreach (Storage::disk('public')->directories($dir) as $sub) {
                    Storage::disk('public')->deleteDirectory($sub);
                }
                Storage::disk('public')->deleteDirectory($dir);
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to cleanup avatar files on user delete', [
                'error' => $e->getMessage(),
                'target_user_id' => $user->id,
            ]);
        }

        $user->delete();
        return response()->json(['message' => 'deleted']);
    }

    /**
     * POST /api/users
     * 新規ユーザー作成（認証不要）
     */
    public function store(Request $request): JsonResponse
    {
        // 認証不要のため、権限チェックを削除
        // $actor = $request->user();
        // if (!$actor || !$this->isAdminOrManager($actor)) {
        //     abort(403, 'ユーザー作成権限がありません');
        // }

        // バリデーション
        $data = $request->validate([
            'user_id'   => ['required', 'string', 'max:255', 'unique:users,user_id'],
            'name'      => ['required', 'string', 'max:255'],
            'role'      => ['required', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            'password'  => ['required', Password::min(8)],
            'icon_name' => ['nullable', 'string', 'max:255'],
            'avatar'    => ['nullable', 'file', 'image', 'max:5120'], // 5MB
        ]);

        $user = new User();
        $user->user_id = $data['user_id'];
        $user->name    = $data['name'];
        $user->role    = $data['role'];
        $user->password = Hash::make($data['password']);
        $user->is_active = true;

        // 画像アップロード対応
        if ($request->hasFile('avatar')) {
            $ext = strtolower($request->file('avatar')->getClientOriginalExtension() ?: $request->file('avatar')->extension() ?: 'jpg');
            $filename = 'user-' . uniqid() . '.' . $ext;
            $request->file('avatar')->storeAs('avatars', $filename, 'public');
            $user->avatar_path = 'avatars/' . $filename;
            $user->icon_name = null;
        } else {
            $user->icon_name = $data['icon_name'] ?? null;
            $user->avatar_path = null;
        }

        $user->save();

        return response()->json([
            'message' => 'created',
            'user' => [
                'id'         => (string) $user->id,
                'user_id'    => $user->user_id,
                'name'       => $user->name,
                'role'       => $user->role,
                'icon_name'  => $user->icon_name,
                'avatar_url' => $user->avatar_path
                    ? Storage::disk('public')->url($user->avatar_path) . '?v=' . ($user->updated_at?->timestamp ?? time())
                    : null,
            ],
        ], 201);
    }

    private function isAdmin(User $user): bool
    {
        return $user->role === 'admin';
    }

    private function isAdminOrManager(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }

    // ユーザー一覧取得の権限チェック（全認証ユーザーに許可）
    private function authorizeList(?User $user): void
    {
        if (!$user) {
            abort(401);
        }
        // 必要に応じて、管理者/マネージャーに限定するなら以下のように変更:
        // if (!in_array($user->role, ['admin', 'manager'], true)) {
        //     abort(403, '一覧取得の権限がありません');
        // }
    }
}
