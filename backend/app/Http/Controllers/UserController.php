<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
            'name'      => ['required', 'string', 'max:255'],
            'role'      => ['nullable', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            'icon_name' => ['nullable', 'string', 'max:255'],
        ]);

        $user->name = $data['name'];

        // role は管理者/マネージャーのみ変更可
        if (array_key_exists('role', $data) && $this->isAdminOrManager($actor)) {
            $user->role = $data['role'] ?? $user->role;
        }

        // icon_name が送られてきた場合：画像を解除してアイコンに切替（null も許可）
        if ($request->exists('icon_name')) {
            $user->icon_name = $data['icon_name'] ?: null;
            if (!empty($user->avatar_path)) {
                Storage::disk('public')->delete($user->avatar_path);
                $user->avatar_path = null;
            }
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

        // role は管理者/マネージャーのみ変更可
        if (array_key_exists('role', $data) && $this->isAdminOrManager($actor)) {
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
     * 管理者/マネージャーのみ、対象ユーザーのパスワードを更新。
     */
    public function updatePassword(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();
        if (!$actor) {
            abort(401);
        }
        if (!$this->isAdminOrManager($actor)) {
            abort(403, 'パスワード更新権限がありません');
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
            ->select(['id', 'user_id', 'name', 'role', 'icon_name', 'avatar_path', 'updated_at'])
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
                ];
            });

        return response()->json($users);
    }

    private function isAdminOrManager(User $user): bool
    {
        return in_array($user->role, ['admin', 'manager'], true);
    }
}
