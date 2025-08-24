<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

// 基本的なテストルート
Route::get('/test', function () {
    return response()->json([
        'message' => 'Laravel is working!',
        'debug' => config('app.debug'),
        'env' => config('app.env'),
        'timestamp' => now()
    ]);
});

// Sanctumの標準ルートを使用
// routes/web.phpにSanctumのCSRF cookieルートが自動的に登録されます

// その他のWebルートがあればここに追加
