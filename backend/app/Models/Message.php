<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'user',
        'content',
        'channel_id',
        'timestamp',
        'file_path',
        'file_name',
        'mime_type',
    ];

    protected $appends = [
        'file_url',
    ];

    public function channel()
    {
        return $this->belongsTo(Channel::class);
    }

    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->file_path)) {
            return null;
        }
        // public ディスクに保存されたパスを /storage/... の公開URLに変換
        return Storage::disk('public')->url($this->file_path);
    }
}
