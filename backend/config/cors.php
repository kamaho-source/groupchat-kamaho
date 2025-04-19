<?php

// config/cors.php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or “CORS”. This determines what cross-origin operations may execute
    | in web browsers.
    |
    */

    // CSRF Cookie の取得と API 呼び出しを許可するパス
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
    ],

    // 許可する HTTP メソッド
    'allowed_methods' => ['*'],

    // 許可するオリジン（Next.js: localhost:3000）
    'allowed_origins' => [
        'http://localhost:3000',
    ],

    // オリジンのパターンマッチ（必要なければ空配列で OK）
    'allowed_origins_patterns' => [],

    // 許可する HTTP ヘッダー
    'allowed_headers' => ['*'],

    // レスポンスで公開するヘッダー
    'exposed_headers' => [],

    // プリフライトリクエストのキャッシュ時間（秒）
    'max_age' => 0,

    // Cookie 認証（Sanctum）を有効化
    'supports_credentials' => true,
];
