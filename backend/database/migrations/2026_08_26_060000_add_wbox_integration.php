<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
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
                $table->string('wbox_kiosk_number', 32)->default('K01');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_version')) {
                $table->string('wbox_version', 32)->default('w.0.0.1');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_pdaver')) {
                $table->string('wbox_pdaver', 64)->default('GoodTaste');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_server')) {
                $table->string('wbox_server', 32)->default('w');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_device')) {
                $table->string('wbox_device', 64)->default('127.0.0.1');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_product')) {
                $table->string('wbox_product', 32)->default('135');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_auth_token_encrypted')) {
                $table->text('wbox_auth_token_encrypted')->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_response_filename')) {
                $table->string('wbox_response_filename', 128)->default('SendOrder.response');
            }
            if (! Schema::hasColumn('system_settings', 'wbox_retry_seconds')) {
                $table->unsignedSmallInteger('wbox_retry_seconds')->default(30);
            }
        });

        Schema::table('products', function (Blueprint $table): void {
            if (! Schema::hasColumn('products', 'wbox_item_code')) {
                $table->string('wbox_item_code', 64)->nullable()->index();
            }
        });

        Schema::table('order_items', function (Blueprint $table): void {
            if (! Schema::hasColumn('order_items', 'wbox_item_code')) {
                $table->string('wbox_item_code', 64)->nullable()->after('sku');
            }
        });

        Schema::create('wbox_exports', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status', 24)->default('pending')->index();
            $table->unsignedSmallInteger('attempt_count')->default(0);
            $table->string('request_filename', 255)->nullable();
            $table->string('request_hash', 64)->nullable();
            $table->string('baseline_response_hash', 64)->nullable();
            $table->string('response_hash', 64)->nullable()->index();
            $table->boolean('response_success')->nullable();
            $table->text('response_message')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamp('available_at')->nullable()->index();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wbox_exports');

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('wbox_item_code');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropColumn('wbox_item_code');
        });

        Schema::table('system_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'wbox_enabled',
                'wbox_request_path',
                'wbox_response_path',
                'wbox_kiosk_number',
                'wbox_version',
                'wbox_pdaver',
                'wbox_server',
                'wbox_device',
                'wbox_product',
                'wbox_auth_token_encrypted',
                'wbox_response_filename',
                'wbox_retry_seconds',
            ]);
        });
    }
};
