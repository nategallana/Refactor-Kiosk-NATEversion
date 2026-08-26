<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 32);  // 'counter', 'paymongo', 'maya', etc.
            $table->string('provider_reference')->nullable();  // external payment ID
            $table->unsignedBigInteger('amount_minor');
            $table->string('currency', 3)->default('PHP');
            $table->string('status', 24)->default('pending');
                // pending|processing|succeeded|failed|cancelled|refunded
            $table->string('payment_channel', 32)->nullable();  // card_present, qr_ph, counter
            $table->json('metadata_json')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
