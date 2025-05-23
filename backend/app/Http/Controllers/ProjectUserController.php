<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class ProjectUserController extends Controller
{
    /**
     * プロジェクトメンバー一覧取得
     * GET /api/projects/{project}/users
     */
    public function index(Project $project): JsonResponse
    {
        $members = $project
            ->users()
            ->withPivot('role','is_public')
            ->get();

        return response()->json($members);
    }

    /**
     * プロジェクトにユーザーを追加／更新
     * POST /api/projects/{project}/users
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'user_ids'   => 'required|array|min:1',
            'user_ids.*' => 'integer|exists:users,id',
            'role'       => 'required|string|in:member,admin',
            'is_public'  => 'required|boolean',
        ]);

        // 既存メンバーを残しつつ追加・更新
        $syncData = [];
        foreach ($data['user_ids'] as $uid) {
            $syncData[$uid] = [
                'role'      => $data['role'],
                'is_public' => $data['is_public'],
            ];
        }
        $project->users()->syncWithoutDetaching($syncData);

        return response()->json([
            'message' => 'メンバーを更新しました。',
        ]);
    }

    /**
     * プロジェクトからユーザーを削除
     * DELETE /api/projects/{project}/users/{user}
     */
    public function destroy(Project $project, User $user): JsonResponse
    {
        $project->users()->detach($user->id);

        return response()->json([
            'message' => 'メンバーを削除しました。',
        ]);
    }
}
