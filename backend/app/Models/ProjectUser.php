<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectUser extends Model
{
    protected $table = 'project_users'; // テーブル名を指定
    protected $fillable = ['project_id', 'user_id', 'role', 'is_public'];

}
