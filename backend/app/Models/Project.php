<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Models\User;

class Project extends Model
{
    protected $fillable =
        [
            'id',
            'name',
            'description',
        ];

    public function channel()
    {
        return $this->belongsTo(Channel::class, 'id');

    }

    public function users():BelongsToMany
    {
        return $this->belongsToMany(User::class, 'project_users')
                    ->withPivot(['role','is_public'])
                    ->withTimestamps();
    }

    public function files()
    {
        return $this->hasMany(ProjectFile::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

}
