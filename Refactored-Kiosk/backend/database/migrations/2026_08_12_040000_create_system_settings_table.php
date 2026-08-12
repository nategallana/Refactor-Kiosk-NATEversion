<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table): void {
            $table->id();
            $table->string('brand_name', 80)->default('Table & Company');
            $table->unsignedSmallInteger('tax_rate_basis_points')->default(1200);
            $table->string('service_mode', 16)->default('both');
            $table->string('currency', 3)->default('PHP');
            $table->boolean('counter_payment_enabled')->default(true);
            $table->boolean('card_payment_enabled')->default(true);
            $table->unsignedSmallInteger('idle_timeout_seconds')->default(120);
            $table->unsignedSmallInteger('auto_reset_seconds')->default(15);
            $table->string('receipt_header', 120)->nullable();
            $table->string('receipt_footer', 240)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
