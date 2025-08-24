<?php

return [
    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        'login',
        'logout',
        'user',
    ],

    'allowed_methods'   => ['*'],
    'allowed_origins'   => [
        'http://localhost:3000',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8000',
        'http://host.docker.internal:3000',
        'http://host.docker.internal:8000'
    ],
    'allowed_origin_patterns' => [],
    'allowed_headers'   => ['*'],
    'exposed_headers'   => [],
    'max_age'          => 0,
    'supports_credentials' => true,
];
