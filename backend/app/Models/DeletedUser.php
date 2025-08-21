<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeletedUser extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'role',
        'email',
        'deleted_at',
    ];

    protected $casts = [
        'deleted_at' => 'datetime',
    ];
}
