<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

uses(RefreshDatabase::class)->group('pending-integration');

beforeEach(function () {
    $this->seed();
    $this->withToken('dev-kiosk-token-01');
    $this->wboxRoot = storage_path('framework/testing/wbox-'.Str::uuid());
    $this->wboxRequestPath = $this->wboxRoot.DIRECTORY_SEPARATOR.'Request';
    $this->wboxResponsePath = $this->wboxRoot.DIRECTORY_SEPARATOR.'Response';
    File::ensureDirectoryExists($this->wboxRequestPath);
    File::ensureDirectoryExists($this->wboxResponsePath);

    DB::table('system_settings')->where('id', 1)->update([
        'wbox_enabled' => true,
        'wbox_request_path' => $this->wboxRequestPath,
        'wbox_response_path' => $this->wboxResponsePath,
        'wbox_kiosk_number' => 'K01',
        'wbox_auth_token_encrypted' => Crypt::encryptString('test-wbox-token'),
        'wbox_retry_seconds' => 5,
    ]);
    DB::table('products')->where('sku', 'BRG-001')->update(['wbox_item_code' => '10045']);
});

afterEach(function () {
    File::deleteDirectory($this->wboxRoot);
});

function wboxOrderPayload(): array
{
    return [
        'terminal_id' => 'KIOSK-01',
        'dining_type' => 'dine-in',
        'payment_method' => 'counter',
        'items' => [[
            'sku' => 'BRG-001',
            'quantity' => 2,
            'note' => '',
            'selections' => [['groupId' => 'size', 'valueId' => 'regular']],
        ]],
    ];
}

it('queues and atomically delivers an order using the legacy WBOX request contract', function () {
    $order = $this->postJson('/api/v1/orders', wboxOrderPayload(), [
        'Idempotency-Key' => (string) Str::uuid(),
    ])->assertCreated()->json('order');

    $this->assertDatabaseHas('wbox_exports', ['order_id' => $order['id'], 'status' => 'pending']);
    $this->assertDatabaseHas('order_items', ['order_id' => $order['id'], 'wbox_item_code' => '10045']);
    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();

    $requestFilename = 'K01Ticket#'.$order['id'].'.request';
    $requestPath = $this->wboxRequestPath.DIRECTORY_SEPARATOR.$requestFilename;
    $signalPath = $this->wboxRequestPath.DIRECTORY_SEPARATOR.'K01Ticket#'.$order['id'].'.sig';
    expect($requestPath)->toBeFile()->and($signalPath)->toBeFile();

    $xml = simplexml_load_file($requestPath);
    expect((string) $xml['version'])->toBe('w.0.0.1')
        ->and((string) $xml['authtoken'])->toBe('test-wbox-token')
        ->and((string) $xml->Order['id'])->toBe('Tmp'.$order['id'])
        ->and((string) $xml->Order->OrderItem['id'])->toBe('10045')
        ->and((string) $xml->Order->OrderItem['price'])->toBe('438.00');

    $this->assertDatabaseHas('wbox_exports', [
        'order_id' => $order['id'],
        'status' => 'sent',
        'request_filename' => $requestFilename,
    ]);
});

it('matches a new WBOX response to the single outstanding sent order', function () {
    $order = $this->postJson('/api/v1/orders', wboxOrderPayload(), [
        'Idempotency-Key' => (string) Str::uuid(),
    ])->assertCreated()->json('order');
    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();

    $document = new DOMDocument('1.0', 'UTF-8');
    $root = $document->createElement('SendOrderResponse');
    $result = $document->createElement('SendOrderResult');
    $result->setAttribute('success', 'true');
    $result->setAttribute('message', 'Order accepted');
    $root->appendChild($result);
    $document->appendChild($root);
    File::put($this->wboxResponsePath.DIRECTORY_SEPARATOR.'SendOrder.response', $document->saveXML());

    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();
    $this->assertDatabaseHas('wbox_exports', [
        'order_id' => $order['id'],
        'status' => 'acknowledged',
        'response_success' => true,
        'response_message' => 'Order accepted',
    ]);
});

it('records a safe retryable failure when an item has no WBOX mapping', function () {
    DB::table('products')->where('sku', 'BRG-001')->update(['wbox_item_code' => null]);
    $order = $this->postJson('/api/v1/orders', wboxOrderPayload(), [
        'Idempotency-Key' => (string) Str::uuid(),
    ])->assertCreated()->json('order');

    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();

    $export = DB::table('wbox_exports')->where('order_id', $order['id'])->first();
    expect($export->status)->toBe('failed')
        ->and($export->last_error)->toContain('does not have a WBOX item code');
    expect(File::files($this->wboxRequestPath))->toBeEmpty();
});

it('uses the exact legacy TO GO table value for takeout orders', function () {
    $payload = wboxOrderPayload();
    $payload['dining_type'] = 'takeout';
    $order = $this->postJson('/api/v1/orders', $payload, [
        'Idempotency-Key' => (string) Str::uuid(),
    ])->assertCreated()->json('order');

    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();
    $requestPath = $this->wboxRequestPath.DIRECTORY_SEPARATOR.'K01Ticket#'.$order['id'].'.request';
    $xml = simplexml_load_file($requestPath);
    expect((string) $xml->Order['table'])->toBe('TO GO1F');
});

it('keeps WBOX credentials and local paths out of the public settings response', function () {
    $admin = User::factory()->create(['role' => 'store_admin']);
    $payload = (array) DB::table('system_settings')->where('id', 1)->first();
    unset($payload['id'], $payload['created_at'], $payload['updated_at'], $payload['wbox_auth_token_encrypted']);
    $payload['wbox_auth_token'] = 'replacement-secret';

    $this->actingAs($admin)->putJson('/api/v1/admin/settings', $payload)
        ->assertOk()
        ->assertJsonPath('settings.wbox_auth_token_configured', true)
        ->assertJsonMissingPath('settings.wbox_auth_token_encrypted')
        ->assertJsonMissingPath('settings.wbox_auth_token');

    $this->getJson('/api/v1/settings')
        ->assertOk()
        ->assertJsonMissingPath('settings.wbox_request_path')
        ->assertJsonMissingPath('settings.wbox_response_path')
        ->assertJsonMissingPath('settings.wbox_auth_token_encrypted');
});

it('routes exports independently for two terminals in the same store', function () {
    DB::table('terminals')->insertOrIgnore([
        'id' => 'KIOSK-02',
        'name' => 'Kiosk Terminal 2',
        'store_id' => 1,
        'wbox_kiosk_number' => 'K02',
        'api_token' => hash('sha256', 'token-2'),
        'status' => 'online',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $payload1 = wboxOrderPayload();
    $payload1['terminal_id'] = 'KIOSK-01';
    $order1 = $this->postJson('/api/v1/orders', $payload1, ['Idempotency-Key' => (string) Str::uuid()])
        ->assertCreated()->json('order');

    $payload2 = wboxOrderPayload();
    $payload2['terminal_id'] = 'KIOSK-02';
    $order2 = $this->withToken('token-2')->postJson('/api/v1/orders', $payload2, ['Idempotency-Key' => (string) Str::uuid()])
        ->assertCreated()->json('order');

    // First run exports order 1 (K01)
    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();
    $this->assertDatabaseHas('wbox_exports', ['order_id' => $order1['id'], 'status' => 'sent', 'request_filename' => 'K01Ticket#'.$order1['id'].'.request']);

    // Acknowledge order 1 so bridge can process next order
    $document = new DOMDocument('1.0', 'UTF-8');
    $root = $document->createElement('SendOrderResponse');
    $result = $document->createElement('SendOrderResult');
    $result->setAttribute('success', 'true');
    $result->setAttribute('message', 'Order 1 accepted');
    $root->appendChild($result);
    $document->appendChild($root);
    File::put($this->wboxResponsePath.DIRECTORY_SEPARATOR.'SendOrder.response', $document->saveXML());

    // Second run acknowledges order 1 and exports order 2 (K02)
    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();
    $this->assertDatabaseHas('wbox_exports', ['order_id' => $order2['id'], 'status' => 'sent', 'request_filename' => 'K02Ticket#'.$order2['id'].'.request']);
});

it('recovers stale processing records and retries failed exports', function () {
    $order = $this->postJson('/api/v1/orders', wboxOrderPayload(), ['Idempotency-Key' => (string) Str::uuid()])
        ->assertCreated()->json('order');

    // Manually mark export as stuck in processing for > 60s
    DB::table('wbox_exports')->where('order_id', $order['id'])->update([
        'status' => 'processing',
        'updated_at' => now()->subMinutes(5),
    ]);

    // Bridge run should recover it back to pending and export it
    $this->artisan('wbox:bridge', ['--once' => true])->assertSuccessful();
    $this->assertDatabaseHas('wbox_exports', ['order_id' => $order['id'], 'status' => 'sent']);
});

