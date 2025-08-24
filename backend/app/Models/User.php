<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Project;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $primaryKey = 'id';
    public $incrementing = true;
    protected $keyType = 'int';

    /**
     * ユーザー名として使用するフィールドを指定
     */
    public function getAuthIdentifierName()
    {
        return 'user_id';
    }

    protected $fillable = [
        'user_id',
        'name',
        'password',
        'role',
        'icon_name',
        'avatar_path',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'password' => 'hashed',
    ];

    public function projects(): BelongsToMany
    {
        return $this->belongsToMany(
            Project::class,
            'project_users'     // ← Project モデルと合わせる
        )
            ->withPivot(['role','is_public'])
            ->withTimestamps();
    }


}
