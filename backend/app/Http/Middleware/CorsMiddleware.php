<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // プリフライトリクエスト（OPTIONS）の処理
        if ($request->isMethod('OPTIONS')) {
            $response = response('', 200);
        }

        // CORSヘッダーの設定
        $response->headers->set('Access-Control-Allow-Origin', $this->getAllowedOrigin($request));
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Accept, Accept-Language, Content-Language, Content-Type, X-Requested-With, X-CSRF-TOKEN, Authorization, X-XSRF-TOKEN, Cache-Control, Pragma');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Max-Age', '86400');

        return $response;
    }

    /**
     * 許可されたオリジンを取得
     */
    private function getAllowedOrigin(Request $request): string
    {
        $allowedOrigins = array_filter(explode(',', env('FRONTEND_URLS', 'http://localhost:3000,http://127.0.0.1:3000')));
        $origin = $request->header('Origin');

        if (in_array($origin, $allowedOrigins)) {
            return $origin;
        }

        return $allowedOrigins[0] ?? 'http://localhost:3000';
    }
}
