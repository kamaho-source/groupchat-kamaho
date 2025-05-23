<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectFileController extends Controller
{
    /**
     * ファイル一覧取得
     * GET /api/projects/{project}/files
     */
    public function index(Project $project)
    {
        // ファイルのURLを含めて返却
        $files = $project->files()->with('user')->get()->map(function ($file) {
            return [
                'id'             => $file->id,
                'original_name'  => $file->original_name,
                'path'           => Storage::url($file->path),
                'mime_type'      => $file->mime_type,
                'size'           => $file->size,
                'user'           => $file->user,
                'created_at'     => $file->created_at,
            ];
        });

        return response()->json($files);
    }

    /**
     * ファイルアップロード
     * POST /api/projects/{project}/files
     */
    public function store(Request $req, Project $project)
    {
        $req->validate([
            'file' => 'required|file|max:5120', // 5MB max

        ]);

        $user = $req->user();
        // public ディスクに保存して public/storage/project_files/... に出力
        $path = $req->file('file')->store("project_files/{$project->id}", 'public');

        $file = $project->files()->create([
            'user_id'       => $user->id,
            'path'          => $path,
            'original_name' => $req->file('file')->getClientOriginalName(),
            'mime_type'     => $req->file('file')->getClientMimeType(),
            'size'          => $req->file('file')->getSize(),
        ]);

        return response()->json($file, 201);
    }

    /**
     * ファイル削除
     * DELETE /api/projects/{project}/files/{file}
     */
    public function destroy(Project $project, ProjectFile $file)
    {
        // public ディスクから削除
        Storage::disk('public')->delete($file->path);
        $file->delete();

        return response()->json(['message' => 'ファイルを削除しました']);
    }
}
