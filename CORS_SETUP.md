# Laravel 11 + Next.js SPA CORS設定ガイド

## 概要
このプロジェクトは Laravel 11 のバックエンドAPIと Next.js のフロントエンドで構成されるSPA（Single Page Application）です。
**クッキーベースの認証**を使用してセキュアな認証システムを実装しています。

## CORS設定の詳細

### 1. Laravel側の設定

#### CORS設定ファイル (`config/cors.php`)
- 許可されたパス: `api/*`, `sanctum/*`, `login`, `logout`, `user`, `register`, `broadcasting/auth`, `storage/*`
- 許可されたメソッド: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`
- 許可されたオリジン: 環境変数 `FRONTEND_URLS` で設定
- クレデンシャルサポート: 有効（`supports_credentials: true`）

#### CORSミドルウェア (`app/Http/Middleware/CorsMiddleware.php`)
- プリフライトリクエスト（OPTIONS）の適切な処理
- 動的なオリジン許可
- セキュリティヘッダーの設定

#### Kernel設定 (`app/Http/Kernel.php`)
- `web` と `api` ミドルウェアグループの両方にCORSミドルウェアを追加
- 適切な実行順序でミドルウェアを配置

#### Fortify設定 (`config/fortify.php`)
- クッキーベースの認証を有効化
- セッション管理とCSRF保護
- カスタム認証ロジック

#### Sanctum設定 (`config/sanctum.php`)
- セッション認証の有効化
- ステートフルドメインの設定
- クッキーベースのAPI認証

#### セッション設定 (`config/session.php`)
- クッキーベースのセッション管理
- 適切なドメインとセキュリティ設定

### 2. Next.js側の設定

#### APIリライト設定 (`next.config.ts`)
- Laravel APIへの適切なリライト設定
- Sanctum認証のサポート
- ファイルストレージへのアクセス

#### 開発環境用CORSヘッダー
- 開発環境でのみ有効なCORSヘッダー設定
- 本番環境では無効化

#### 認証フック (`lib/auth.ts`)
- クッキーベースの認証状態管理
- ログイン・ログアウト処理
- 認証状態の確認

## クッキーベース認証の仕組み

### 1. 認証フロー
1. **CSRF Cookie取得**: `/sanctum/csrf-cookie` でCSRFトークンを取得
2. **ログイン**: `/api/login` でユーザー認証とセッション開始
3. **セッション管理**: クッキーを使用したセッション認証
4. **API認証**: セッションクッキーによるAPI認証

### 2. セキュリティ機能
- CSRF保護
- セッション管理
- クッキーの暗号化
- 適切なCORS設定

## セットアップ手順

### 1. 環境変数の設定

#### Laravel側 (`.env`)
```bash
# CORS設定
FRONTEND_URLS=http://localhost:3000,http://127.0.0.1:3000

# Sanctum設定
SANCTUM_STATEFUL_DOMAINS=localhost:3000,127.0.0.1:3000

# セッション設定
SESSION_DOMAIN=localhost
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
SESSION_LIFETIME=120

# アプリケーション設定
APP_KEY=base64:your-app-key-here
```

#### Next.js側 (`.env.local`)
```bash
# Laravel API設定
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SANCTUM_URL=http://localhost:8000/sanctum

# 開発環境設定
NODE_ENV=development
```

### 2. アプリケーションの起動

#### Laravel側
```bash
cd backend
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

#### Next.js側
```bash
cd frontend
npm install
npm run dev
```

### 3. 認証のテスト

#### ログインフロー
1. ブラウザで `http://localhost:3000/login` にアクセス
2. ユーザーIDとパスワードを入力
3. ログイン成功後、クッキーが設定されることを確認
4. 認証が必要なページにアクセスして認証状態を確認

#### API認証のテスト
```bash
# セッションクッキーを使用したAPIリクエスト
curl -X GET http://localhost:8000/api/user \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -b "laravel_session=your-session-cookie" \
  -v
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. クッキーが発行されない
- セッションドメインの設定を確認
- CORS設定でクレデンシャルサポートが有効か確認
- ミドルウェアの順序が正しいか確認

#### 2. 認証が機能しない
- CSRF Cookieが正しく取得されているか確認
- セッション設定が適切か確認
- ブラウザの開発者ツールでクッキーを確認

#### 3. CORSエラーが発生する
- 環境変数 `FRONTEND_URLS` が正しく設定されているか確認
- プリフライトリクエストが適切に処理されているか確認

#### 4. セッションが保持されない
- セッションライフタイムの設定を確認
- ブラウザのクッキー設定を確認
- セッションドライバーが正しく設定されているか確認

## セキュリティ考慮事項

### 本番環境での設定
- 許可されたオリジンを本番ドメインに制限
- HTTPSの強制（`SESSION_SECURE_COOKIE=true`）
- 適切なセッションライフタイムの設定
- セキュアなクッキー設定

### 開発環境での設定
- ローカル開発用のオリジンのみ許可
- HTTPでの開発（`SESSION_SECURE_COOKIE=false`）
- 適切なデバッグ情報の制御

## 参考資料
- [Laravel CORS Documentation](https://laravel.com/docs/11.x/cors)
- [Laravel Sanctum Documentation](https://laravel.com/docs/11.x/sanctum)
- [Laravel Fortify Documentation](https://laravel.com/docs/11.x/fortify)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Session-based Authentication](https://laravel.com/docs/11.x/session) 