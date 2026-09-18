<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            if (! Schema::hasColumn('system_settings', 'wbox_agent_token')) {
                $table->string('wbox_agent_token', 64)->nullable()->unique();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_agent_last_heartbeat_at')) {
                $table->timestamp('wbox_agent_last_heartbeat_at')->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_agent_hostname')) {
                $table->string('wbox_agent_hostname', 128)->nullable();
            }
            if (! Schema::hasColumn('system_settings', 'wbox_agent_request_ok')) {
                $table->boolean('wbox_agent_request_ok')->default(false);
            }
            if (! Schema::hasColumn('system_settings', 'wbox_agent_response_ok')) {
                $table->boolean('wbox_agent_response_ok')->default(false);
            }
            if (! Schema::hasColumn('system_settings', 'wbox_agent_version')) {
                $table->string('wbox_agent_version', 32)->nullable();
            }
        });

        // Ensure default store has an agent token
        $settings = DB::table('system_settings')->where('id', 1)->first();
        if ($settings && empty($settings->wbox_agent_token)) {
            DB::table('system_settings')->where('id', 1)->update([
                'wbox_agent_token' => 'wbx_agent_' . Str::random(32),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'wbox_agent_token',
                'wbox_agent_last_heartbeat_at',
                'wbox_agent_hostname',
                'wbox_agent_request_ok',
                'wbox_agent_response_ok',
                'wbox_agent_version',
            ]);
        });
    }
};
