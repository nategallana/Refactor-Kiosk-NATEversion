<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('terminals', function (Blueprint $table): void {
            $table->string('wbox_kiosk_number', 32)->nullable()->after('id')->index();
        });
    }

    public function down(): void
    {
        Schema::table('terminals', fn (Blueprint $table) => $table->dropColumn('wbox_kiosk_number'));
    }
};
