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
    'allowed_origins'   => ['http://localhost:3000', 'http://localhost:8000'],
    'allowed_origin_patterns' => ['*'],
    'allowed_headers'   => ['*'],
    'supports_credentials' => true,
];
