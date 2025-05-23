<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use App\Events\NewProjectMessage;

class ProjectChatController extends Controller
{
    public function show(Request $req, Project $project)
    {
        // 参加チェック
        abort_unless(
            $project->users()->where('user_id',$req->user()->id)->exists(),
            403
        );
        return response()->json(
            \App\Models\Message::where('channel_id',$project->channel_id)
                ->with('user')
                ->get()
        );
    }

    public function send(Request $req, Project $project)
    {
        abort_unless(
            $project->users()->where('user_id',$req->user()->id)->exists(),
            403
        );
        $msg = $project->channel->messages()->create([
            'user_id'    => $req->user()->id,
            'body'       => $req->input('body'),
        ]);
        broadcast(new NewProjectMessage($msg))->toOthers();
        return response()->json($msg->load('user'));
    }
}
