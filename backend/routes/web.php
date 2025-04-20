<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});
Route::middleware(['web','auth:sanctum'])->get('/api/user', function (Request $request) {
    return $request->user();
});

