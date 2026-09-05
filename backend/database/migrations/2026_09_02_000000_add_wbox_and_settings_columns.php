<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('system_settings', 'welcome_background_url')) {
                $table->text('welcome_background_url')->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'welcome_background_image')) {
                $table->string('welcome_background_image', 500)->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'timezone')) {
                $table->string('timezone', 64)->default('Asia/Manila')->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_enabled')) {
                $table->boolean('wbox_enabled')->default(false);
            }
            if (! Schema::hasColumn('system_settings', 'wbox_request_path')) {
                $table->string('wbox_request_path', 512)->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_response_path')) {
                $table->string('wbox_response_path', 512)->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_kiosk_number')) {
                $table->string('wbox_kiosk_number', 32)->default('KIOSK-01');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_version')) {
                $table->string('wbox_version', 32)->default('1.0');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_pdaver')) {
                $table->string('wbox_pdaver', 64)->default('1.0');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_server')) {
                $table->string('wbox_server', 32)->default('127.0.0.1');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_device')) {
                $table->string('wbox_device', 64)->default('POS-01');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_product')) {
                $table->string('wbox_product', 32)->default('RETAIL');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_auth_token')) {
                $table->text('wbox_auth_token')->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_response_filename')) {
                $table->string('wbox_response_filename', 128)->default('response.json');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_retry_seconds')) {
                $table->unsignedSmallInteger('wbox_retry_seconds')->default(60);
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            if (! Schema::hasColumn('products', 'wbox_menukey')) {
                $table->string('wbox_menukey', 64)->nullable()->after('sku');
            }
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $columns = [
                'welcome_background_url',
                'welcome_background_image',
                'timezone',
                'wbox_enabled',
                'wbox_request_path',
                'wbox_response_path',
                'wbox_kiosk_number',
                'wbox_version',
                'wbox_pdaver',
                'wbox_server',
                'wbox_device',
                'wbox_product',
                'wbox_auth_token',
                'wbox_response_filename',
                'wbox_retry_seconds',
            ];
            foreach ($columns as $column) {
                if (Schema::hasColumn('system_settings', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            if (Schema::hasColumn('products', 'wbox_menukey')) {
                $table->dropColumn('wbox_menukey');
            }
        });
    }
};
