<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 32)->default('staff')->after('password')->index();
        });
        Schema::create('categories', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('products', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price_minor');
            $table->string('emoji', 16)->nullable();
            $table->string('accent', 16)->default('#EFC767');
            $table->boolean('active')->default(true);
            $table->boolean('available')->default(true);
            $table->timestamps();
        });
        Schema::create('orders', function (Blueprint $table): void {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('terminal_id')->default('demo-terminal-01');
            $table->string('dining_type', 16);
            $table->unsignedBigInteger('subtotal_minor');
            $table->unsignedBigInteger('tax_minor');
            $table->unsignedBigInteger('total_minor');
            $table->string('payment_status', 24)->default('pending')->index();
            $table->string('fulfillment_status', 24)->default('pending')->index();
            $table->timestamp('placed_at')->useCurrent()->index();
            $table->timestamps();
        });
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type');
            $table->string('entity_id');
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->timestamp('created_at')->useCurrent()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('role'));
    }
};
