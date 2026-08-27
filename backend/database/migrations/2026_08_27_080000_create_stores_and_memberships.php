<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stores', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('code', 32)->unique();
            $table->string('timezone', 64)->default('Asia/Manila');
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('store_user', function (Blueprint $table): void {
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 32)->default('store_admin');
            $table->timestamps();
            $table->primary(['store_id', 'user_id']);
        });

        DB::table('stores')->insert([
            'name' => 'Main Store', 'code' => 'MAIN', 'timezone' => 'Asia/Manila',
            'active' => true, 'created_at' => now(), 'updated_at' => now(),
        ]);
        $storeId = (int) DB::table('stores')->where('code', 'MAIN')->value('id');

        foreach (['categories', 'products', 'orders', 'terminals', 'system_settings', 'wbox_exports'] as $tableName) {
            if (Schema::hasTable($tableName) && ! Schema::hasColumn($tableName, 'store_id')) {
                Schema::table($tableName, fn (Blueprint $table) => $table->foreignId('store_id')->nullable()->index());
                DB::table($tableName)->whereNull('store_id')->update(['store_id' => $storeId]);
            }
        }

        DB::table('users')->orderBy('id')->each(function (object $user) use ($storeId): void {
            DB::table('store_user')->insertOrIgnore([
                'store_id' => $storeId, 'user_id' => $user->id,
                'role' => 'store_admin',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        foreach (['categories', 'products', 'orders', 'terminals', 'system_settings', 'wbox_exports'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'store_id')) {
                Schema::table($tableName, fn (Blueprint $table) => $table->dropColumn('store_id'));
            }
        }
        Schema::dropIfExists('store_user');
        Schema::dropIfExists('stores');
    }
};
