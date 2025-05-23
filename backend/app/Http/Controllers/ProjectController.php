<?php
// app/Http/Controllers/Api/ProjectController.php

namespace App\Http\Controllers;

use App\Models\Project;
use Illuminate\Http\Request;

class ProjectController extends Controller
{
    /**
     * プロジェクト一覧取得
     * GET /api/projects
     */
    public function index()
    {
        // 必要に応じて auth()->user() でフィルタを追加可能
        $projects = Project::with('channel')->get();
        return response()->json($projects);
    }

    /**
     * プロジェクト作成
     * POST /api/projects
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
            'channel_id'  => 'required|exists:channels,id',
        ]);

        $project = Project::create($data);

        return response()->json($project, 201);
    }

    /**
     * 単一プロジェクト取得
     * GET /api/projects/{project}
     */
    public function show(Project $project)
    {
        $project->load('channel');
        return response()->json($project);
    }

    /**
     * プロジェクト更新
     * PATCH /api/projects/{project}
     */
    public function update(Request $request, Project $project)
    {
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'description' => 'sometimes|nullable|string',
            'channel_id'  => 'sometimes|required|exists:channels,id',
        ]);

        $project->update($data);

        return response()->json($project);
    }

    /**
     * プロジェクト削除
     * DELETE /api/projects/{project}
     */
    public function destroy(Project $project)
    {
        $project->delete();
        return response()->json(null, 204);
    }
}
