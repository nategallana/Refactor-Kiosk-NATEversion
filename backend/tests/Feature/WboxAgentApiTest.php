<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed();
    DB::table('system_settings')->where('id', 1)->update([
        'wbox_enabled' => true,
        'wbox_agent_token' => 'test_agent_secret_token_123',
        'wbox_kiosk_number' => 'K01',
        'wbox_version' => '1.0',
        'wbox_pdaver' => '1.0',
        'wbox_server' => '127.0.0.1',
        'wbox_device' => 'POS-01',
        'wbox_product' => 'RETAIL',
        'updated_at' => now(),
    ]);
});

test('wbox agent heartbeat updates telemetry when authenticated', function (): void {
    $response = $this->withHeaders([
        'X-Wbox-Agent-Token' => 'test_agent_secret_token_123',
    ])->postJson('/api/v1/wbox/agent/heartbeat', [
        'hostname' => 'POS-TERMINAL-MANILA-01',
        'request_path' => 'C:\\Restrnt\\3rdParty\\Request',
        'request_ok' => true,
        'response_path' => 'C:\\Restrnt\\3rdParty\\Response',
        'response_ok' => true,
        'version' => '1.0.0',
    ]);

    $response->assertOk()
        ->assertJson([
            'status' => 'ok',
        ]);

    $settings = DB::table('system_settings')->where('id', 1)->first();
    expect($settings->wbox_agent_hostname)->toBe('POS-TERMINAL-MANILA-01')
        ->and((bool) $settings->wbox_agent_request_ok)->toBe(true)
        ->and((bool) $settings->wbox_agent_response_ok)->toBe(true)
        ->and($settings->wbox_agent_last_heartbeat_at)->not->toBeNull();
});

test('wbox agent rejects unauthenticated heartbeat', function (): void {
    $response = $this->postJson('/api/v1/wbox/agent/heartbeat', [
        'hostname' => 'UNKNOWN-HOST',
    ]);

    $response->assertStatus(401);
});

test('wbox agent can poll queued order and ack delivery', function (): void {
    // Create an order and export
    $orderId = DB::table('orders')->insertGetId([
        'order_number' => 'K260918-000001',
        'terminal_id' => 'K01',
        'dining_type' => 'dine-in',
        'subtotal_minor' => 15000,
        'tax_minor' => 1800,
        'total_minor' => 16800,
        'payment_method' => 'card',
        'payment_status' => 'pending',
        'fulfillment_status' => 'pending',
        'placed_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    DB::table('order_items')->insert([
        'order_id' => $orderId,
        'product_id' => 1,
        'sku' => 'TEST-01',
        'wbox_item_code' => 'WB-ITEM-01',
        'name' => 'Burger',
        'quantity' => 1,
        'unit_price_minor' => 15000,
        'line_total_minor' => 15000,
        'selections_json' => '[]',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $exportId = DB::table('wbox_exports')->insertGetId([
        'order_id' => $orderId,
        'status' => 'pending',
        'attempt_count' => 0,
        'available_at' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // 1. Poll for the export
    $pollResponse = $this->withHeaders([
        'X-Wbox-Agent-Token' => 'test_agent_secret_token_123',
    ])->getJson('/api/v1/wbox/agent/poll');

    $pollResponse->assertOk()
        ->assertJsonPath('export.id', $exportId)
        ->assertJsonPath('export.order_id', $orderId)
        ->assertJsonStructure([
            'export' => ['id', 'order_id', 'filename', 'signal_filename', 'xml'],
        ]);

    $exportRecord = DB::table('wbox_exports')->where('id', $exportId)->first();
    expect($exportRecord->status)->toBe('processing');

    // 2. Ack write
    $ackResponse = $this->withHeaders([
        'X-Wbox-Agent-Token' => 'test_agent_secret_token_123',
    ])->postJson('/api/v1/wbox/agent/ack', [
        'export_id' => $exportId,
    ]);

    $ackResponse->assertOk();
    $exportRecord = DB::table('wbox_exports')->where('id', $exportId)->first();
    expect($exportRecord->status)->toBe('sent');

    // 3. Upload response
    $respResponse = $this->withHeaders([
        'X-Wbox-Agent-Token' => 'test_agent_secret_token_123',
    ])->postJson('/api/v1/wbox/agent/response', [
        'export_id' => $exportId,
        'response_content' => '{"success":true,"ticket":"1234"}',
        'is_success' => true,
        'message' => 'Success',
    ]);

    $respResponse->assertOk();
    $exportRecord = DB::table('wbox_exports')->where('id', $exportId)->first();
    expect($exportRecord->status)->toBe('acknowledged');
});

test('admin can view agent telemetry and regenerate agent token', function (): void {
    $admin = User::factory()->create(['role' => 'admin']);

    $statusResponse = $this->actingAs($admin)
        ->getJson('/api/v1/admin/settings/wbox/status');

    $statusResponse->assertOk()
        ->assertJsonStructure([
            'connection' => [
                'request_path',
                'response_path',
                'credentials_configured',
                'server_os',
                'agent' => ['token', 'is_connected'],
            ],
        ]);

    $regenResponse = $this->actingAs($admin)
        ->postJson('/api/v1/admin/settings/wbox/regenerate-agent-token');

    $regenResponse->assertOk()
        ->assertJsonStructure(['token']);

    $newToken = $regenResponse->json('token');
    expect($newToken)->toStartWith('wbx_agent_');

    $settings = DB::table('system_settings')->where('id', 1)->first();
    expect($settings->wbox_agent_token)->toBe($newToken);
});

