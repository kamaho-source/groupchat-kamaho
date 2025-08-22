FROM php:8.2-apache

# Install dependencies
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libxml2-dev \
    libonig-dev \
    zip \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install gd zip pdo pdo_mysql mysqli xml

RUN docker-php-ext-install bcmath \
    && docker-php-ext-install opcache \
    && pecl install apcu \
    && docker-php-ext-enable apcu
# Install Composer \
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Enable Apache modules
RUN a2enmod rewrite headers

# PHP performance tuning (OPcache/APCu + general INI)
RUN set -eux; \
    { \
      echo "opcache.enable=1"; \
      echo "opcache.enable_cli=0"; \
      echo "opcache.memory_consumption=192"; \
      echo "opcache.interned_strings_buffer=16"; \
      echo "opcache.max_accelerated_files=65000"; \
      echo "opcache.validate_timestamps=1"; \
      echo "opcache.revalidate_freq=1"; \
      echo "opcache.save_comments=1"; \
      echo "opcache.fast_shutdown=1"; \
      echo "opcache.jit=tracing"; \
      echo "opcache.jit_buffer_size=64M"; \
    } > /usr/local/etc/php/conf.d/10-opcache.ini; \
    { \
      echo "apc.enabled=1"; \
      echo "apc.enable_cli=0"; \
      echo "apc.shm_size=64M"; \
      echo "apc.entries_hint=4096"; \
      echo "apc.ttl=7200"; \
      echo "apc.gc_ttl=3600"; \
    } > /usr/local/etc/php/conf.d/15-apcu.ini; \
    { \
      echo "memory_limit=512M"; \
      echo "realpath_cache_size=4096K"; \
      echo "realpath_cache_ttl=600"; \
      echo "expose_php=0"; \
      echo "upload_max_filesize=64M"; \
      echo "post_max_size=64M"; \
      echo "date.timezone=Asia/Tokyo"; \
    } > /usr/local/etc/php/conf.d/99-performance.ini

# App code
WORKDIR /var/www/html
COPY ./backend/composer.json ./
COPY ./backend/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts
COPY ./backend .
# Apache vhost inside image
COPY ./docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf

# Ensure writable directories (will be overwritten by volume but needed for build)
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

# Pre-optimize (ignore failures if config not ready for build stage)
RUN php artisan storage:link || true \
 && php artisan config:clear || true \
 && php artisan config:cache || true \
 && php artisan route:cache || true \
 && php artisan view:cache || true

# Startup script to recreate storage dirs after volume mount
COPY ./docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh
CMD ["/usr/local/bin/start.sh"]
