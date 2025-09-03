<?php

$frontends = array_filter(array_map('trim', explode(',', env('FRONTEND_URLS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000,http://host.docker.internal:3000,http://host.docker.internal:8000'
))));

return [
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'user',
    ],

    'allowed_methods'   => ['*'],
    'allowed_origins'   => $frontends,
    'allowed_origin_patterns' => [],
    'allowed_headers'   => ['*'],
    'exposed_headers'   => [],
    'max_age'          => 0,
    'supports_credentials' => filter_var(env('CORS_ALLOW_CREDENTIALS', true), FILTER_VALIDATE_BOOL),
];
