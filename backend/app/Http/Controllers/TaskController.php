<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;

class TaskController extends Controller
{
    public function index(Project $project)
    {
        return response()->json($project->tasks()->with('assignee')->get());
    }

    public function store(Request $req, Project $project)
    {
        $data = $req->validate([
            'title'  => 'required|string',
            'description'=>'nullable|string',
            'status' => 'in:todo,doing,done',
            'due_at' => 'nullable|date',
            'assigned_user_id'=>'nullable|exists:users,id',
        ]);

        $task = $project->tasks()->create($data);
        return response()->json($task);
    }

    public function show(Project $project, Task $task)
    {
        return response()->json($task->load('assignee'));
    }

    public function update(Request $req, Project $project, Task $task)
    {
        $data = $req->validate([
            'title','description','status','due_at','assigned_user_id'
        ]);
        $task->update($data);
        return response()->json($task);
    }

    public function destroy(Project $project, Task $task)
    {
        $task->delete();
        return response()->json(['message'=>'タスクを削除しました']);
    }
}
