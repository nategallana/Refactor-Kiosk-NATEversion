<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('terminals', function (Blueprint $table): void {
            $table->string('id', 64)->primary();  // e.g. 'KIOSK-01'
            $table->string('name');
            $table->string('location')->nullable();
            $table->string('api_token', 80)->unique();  // hashed Bearer token
            $table->string('service_mode', 16)->nullable();  // null = inherit system default
            $table->string('screen_profile', 32)->default('1080x1920-portrait');
            $table->string('status', 16)->default('online');  // online|maintenance|decommissioned
            $table->string('ip_address', 45)->nullable();
            $table->string('app_version', 32)->nullable();
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('terminals');
    }
};
