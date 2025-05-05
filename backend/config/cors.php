<?php

return [

    'paths' => [
        'api/*',
        'sanctum/csrf-cookie',
        '/login',
        '/logout',
        '/user',
    ],

    'allowed_methods'   => ['*'],
    'allowed_origins'   => explode(',', env('FRONTEND_URLS', 'http://localhost:3000')),
    'allowed_headers'   => ['*'],
    'supports_credentials' => true,
];
