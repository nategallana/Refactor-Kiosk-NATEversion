<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Access
        if (! Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 64)->unique();
                $table->string('display_name', 128)->nullable();
                $table->string('description', 255)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table): void {
                $table->id();
                $table->string('name', 64)->unique();
                $table->string('display_name', 128)->nullable();
                $table->string('group', 64)->default('general');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('permission_role')) {
            Schema::create('permission_role', function (Blueprint $table): void {
                $table->foreignId('role_id')->constrained()->cascadeOnDelete();
                $table->foreignId('permission_id')->constrained()->cascadeOnDelete();
                $table->primary(['role_id', 'permission_id']);
            });
        }

        // Catalog normalized options & add-ons
        if (! Schema::hasTable('option_groups')) {
            Schema::create('option_groups', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->string('name');
                $table->string('code', 64)->nullable()->index();
                $table->boolean('required')->default(false);
                $table->unsignedSmallInteger('min_selections')->default(0);
                $table->unsignedSmallInteger('max_selections')->default(1);
                $table->unsignedInteger('display_order')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('option_values')) {
            Schema::create('option_values', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->unsignedBigInteger('price_delta_minor')->default(0);
                $table->string('image_url')->nullable();
                $table->string('emoji', 16)->nullable();
                $table->unsignedInteger('display_order')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('product_option_groups')) {
            Schema::create('product_option_groups', function (Blueprint $table): void {
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('option_group_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('display_order')->default(0);
                $table->primary(['product_id', 'option_group_id']);
            });
        }

        if (! Schema::hasTable('add_ons')) {
            Schema::create('add_ons', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->string('name');
                $table->unsignedBigInteger('price_minor')->default(0);
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('product_add_ons')) {
            Schema::create('product_add_ons', function (Blueprint $table): void {
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('add_on_id')->constrained()->cascadeOnDelete();
                $table->primary(['product_id', 'add_on_id']);
            });
        }

        // Ordering sessions & carts
        if (! Schema::hasTable('kiosk_sessions')) {
            Schema::create('kiosk_sessions', function (Blueprint $table): void {
                $table->id();
                $table->string('session_token', 64)->unique();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->string('terminal_id', 64)->nullable()->index();
                $table->string('status', 32)->default('active');
                $table->timestamp('last_activity_at')->useCurrent();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('kiosk_session_id')->nullable()->constrained('kiosk_sessions')->nullOnDelete();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->string('dining_type', 16)->default('dine-in');
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('cart_items')) {
            Schema::create('cart_items', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->unsignedInteger('quantity')->default(1);
                $table->json('selections_json')->nullable();
                $table->string('note', 120)->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('order_item_options')) {
            Schema::create('order_item_options', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
                $table->string('group_id', 64);
                $table->string('group_name', 128);
                $table->string('value_id', 64);
                $table->string('value_name', 128);
                $table->unsignedBigInteger('price_delta_minor')->default(0);
                $table->timestamps();
            });
        }

        // Terminal tokens & heartbeats
        if (! Schema::hasTable('terminal_tokens')) {
            Schema::create('terminal_tokens', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('terminal_id')->constrained('terminals')->cascadeOnDelete();
                $table->string('token_hash', 64)->unique();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('terminal_heartbeats')) {
            Schema::create('terminal_heartbeats', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('terminal_id')->constrained('terminals')->cascadeOnDelete();
                $table->string('status', 32)->default('online');
                $table->string('ip_address', 45)->nullable();
                $table->json('telemetry')->nullable();
                $table->timestamp('recorded_at')->useCurrent()->index();
            });
        }

        // WBOX connection logs
        if (! Schema::hasTable('wbox_connection_logs')) {
            Schema::create('wbox_connection_logs', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->string('event_type', 64);
                $table->boolean('success')->default(true);
                $table->text('message')->nullable();
                $table->json('context')->nullable();
                $table->timestamp('created_at')->useCurrent()->index();
            });
        }

        // Future inventory
        if (! Schema::hasTable('stock_locations')) {
            Schema::create('stock_locations', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('code', 32)->nullable();
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('inventory_items')) {
            Schema::create('inventory_items', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->string('sku', 64)->unique();
                $table->string('name');
                $table->string('unit', 32)->default('pcs');
                $table->decimal('cost_per_unit_minor', 12, 2)->default(0);
                $table->decimal('reorder_level', 12, 2)->default(0);
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('product_recipes')) {
            Schema::create('product_recipes', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
                $table->decimal('quantity_required', 12, 4)->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('stock_movements')) {
            Schema::create('stock_movements', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('inventory_item_id')->constrained()->cascadeOnDelete();
                $table->foreignId('stock_location_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->decimal('quantity', 12, 4);
                $table->string('type', 32); // 'sale', 'restock', 'waste', 'adjustment', 'transfer'
                $table->string('reference_type', 64)->nullable();
                $table->string('reference_id', 64)->nullable();
                $table->string('reason', 255)->nullable();
                $table->timestamp('created_at')->useCurrent()->index();
            });
        }

        if (! Schema::hasTable('stock_counts')) {
            Schema::create('stock_counts', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('status', 32)->default('in_progress'); // 'in_progress', 'completed', 'cancelled'
                $table->timestamp('started_at')->useCurrent();
                $table->timestamp('completed_at')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_counts');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('product_recipes');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('stock_locations');
        Schema::dropIfExists('wbox_connection_logs');
        Schema::dropIfExists('terminal_heartbeats');
        Schema::dropIfExists('terminal_tokens');
        Schema::dropIfExists('order_item_options');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('carts');
        Schema::dropIfExists('kiosk_sessions');
        Schema::dropIfExists('product_add_ons');
        Schema::dropIfExists('add_ons');
        Schema::dropIfExists('product_option_groups');
        Schema::dropIfExists('option_values');
        Schema::dropIfExists('option_groups');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
    }
};
