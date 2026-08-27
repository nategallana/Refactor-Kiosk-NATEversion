<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('products', 'option_groups_json')) {
            Schema::table('products', function (Blueprint $table): void {
                $table->json('option_groups_json')->nullable()->after('price_minor');
            });
        }

        if (! Schema::hasColumn('orders', 'payment_method')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->string('payment_method', 24)->default('counter')->after('total_minor');
            });
        }

        if (! Schema::hasColumn('orders', 'items_json')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->json('items_json')->nullable()->after('payment_method');
            });
        }

        if (! Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('order_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->restrictOnDelete();
                $table->string('sku');
                $table->string('name');
                $table->unsignedInteger('quantity');
                $table->unsignedBigInteger('unit_price_minor');
                $table->unsignedBigInteger('line_total_minor');
                $table->json('selections_json');
                $table->string('note', 80)->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn(['payment_method', 'items_json']);
        });

        Schema::table('products', function (Blueprint $table): void {
            $table->dropColumn('option_groups_json');
        });
    }
};
