FROM php:8.4-cli-alpine

# Install system dependencies and build libraries
RUN apk add --no-cache \
    curl \
    git \
    libzip-dev \
    sqlite-dev \
    postgresql-dev \
    oniguruma-dev \
    libxml2-dev \
    linux-headers \
    && docker-php-ext-install \
    pdo \
    pdo_sqlite \
    pdo_pgsql \
    mbstring \
    xml \
    bcmath \
    ctype \
    fileinfo \
    opcache

# Get official Composer binary
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /app

# Copy backend files
COPY . .

# Prepare directories and permissions
RUN mkdir -p database storage/framework/sessions storage/framework/views storage/framework/cache storage/logs bootstrap/cache \
    && touch database/database.sqlite \
    && chmod -R 777 storage bootstrap/cache database

# Install production dependencies only (no dev packages)
RUN composer install --no-dev --optimize-autoloader --no-interaction

ENV PORT=8000
ENV DB_CONNECTION=sqlite
ENV DB_DATABASE=/app/database/database.sqlite
EXPOSE 8000

CMD sh -c "\
    [ -f .env ] || cp .env.example .env && \
    if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then php artisan key:generate --force; fi && \
    php artisan config:clear && \
    php artisan migrate --force && \
    php artisan db:seed --force && \
    php artisan serve --host=0.0.0.0 --port=\${PORT:-8000}"
