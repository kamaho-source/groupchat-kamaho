#!/usr/bin/env bash
set -euo pipefail

# Recreate writable dirs (in case volume mounted empty)
mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true
chmod -R 775 storage bootstrap/cache || true

# Ensure storage link (ignore if exists)
php artisan storage:link 2>/dev/null || true
# Clear and warm caches (ignore failures if DB not yet up)
php artisan config:clear || true
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# Run migrations if desired (commented to avoid unwanted changes)
# php artisan migrate --force || true

# Start Apache (foreground)
apache2-foreground
