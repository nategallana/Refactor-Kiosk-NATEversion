<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereIn('role', ['admin', 'manager', 'staff', 'store_owner', 'store_manager', 'store_operator'])->update(['role' => 'store_admin']);
        DB::table('store_user')->whereIn('role', ['store_owner', 'store_manager', 'store_operator'])->update(['role' => 'store_admin']);
    }

    public function down(): void
    {
        // Access roles are intentionally not downgraded on rollback.
    }
};
