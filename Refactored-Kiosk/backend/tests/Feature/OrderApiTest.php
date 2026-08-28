<?php

use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed();
});

function validOrderPayload(array $overrides = []): array
{
    return array_replace([
        'order_number' => 'CLIENT-CONTROLLED',
        'terminal_id' => 'KIOSK-01',
        'dining_type' => 'dine-in',
        'payment_method' => 'card',
        'subtotal_minor' => 1,
        'tax_minor' => 0,
        'total_minor' => 1,
        'items' => [[
            'sku' => 'BRG-001',
            'name' => 'Forged product name',
            'unitPrice' => 1,
            'quantity' => 2,
            'note' => 'Sauce on the side',
            'selections' => [
                ['groupId' => 'size', 'valueId' => 'regular', 'priceDelta' => -99999],
                ['groupId' => 'extras', 'valueId' => 'cheese', 'priceDelta' => -99999],
            ],
        ]],
    ], $overrides);
}

function orderHeaders(?string $idempotencyKey = null): array
{
    return ['Idempotency-Key' => $idempotencyKey ?? (string) Str::uuid()];
}

it('creates an order using server-owned products prices tax and order number', function () {
    $response = $this->postJson('/api/v1/orders', validOrderPayload(), orderHeaders())
        ->assertCreated()
        ->assertHeader('Idempotency-Replayed', 'false')
        ->assertJsonPath('order.subtotal_minor', 48800)
        ->assertJsonPath('order.tax_minor', 5856)
        ->assertJsonPath('order.total_minor', 54656)
        ->assertJsonPath('order.payment_status', 'pending')
        ->assertJsonPath('order.items.0.name', 'The House Burger')
        ->assertJsonPath('order.items.0.unitPrice', 24400)
        ->assertJsonPath('order.items.0.selections.1.priceDelta', 2500);

    expect($response->json('order.order_number'))
        ->toMatch('/^K\d{6}-\d{6}$/')
        ->not->toBe('CLIENT-CONTROLLED');

    $this->assertDatabaseCount('orders', 1);
    $this->assertDatabaseCount('order_items', 1);
    $this->assertDatabaseHas('order_items', [
        'sku' => 'BRG-001',
        'quantity' => 2,
        'unit_price_minor' => 24400,
        'line_total_minor' => 48800,
    ]);
});

it('rejects unknown and unavailable products without creating a partial order', function () {
    $payload = validOrderPayload();
    $payload['items'][] = [
        'sku' => 'DOES-NOT-EXIST',
        'quantity' => 1,
        'note' => '',
        'selections' => [],
    ];

    $this->postJson('/api/v1/orders', $payload, orderHeaders())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['items.1.sku']);

    $this->assertDatabaseCount('orders', 0);
    $this->assertDatabaseCount('order_items', 0);

    $this->postJson('/api/v1/orders', validOrderPayload([
        'items' => [[
            'sku' => 'BRG-004',
            'quantity' => 1,
            'note' => '',
            'selections' => [
                ['groupId' => 'size', 'valueId' => 'regular'],
            ],
        ]],
    ]), orderHeaders())->assertUnprocessable()->assertJsonValidationErrors(['items.0.sku']);

    $this->assertDatabaseCount('orders', 0);
});

it('rejects missing invalid and duplicate modifier selections', function () {
    $this->postJson('/api/v1/orders', validOrderPayload([
        'items' => [[
            'sku' => 'BRG-001',
            'quantity' => 1,
            'note' => '',
            'selections' => [],
        ]],
    ]), orderHeaders())->assertUnprocessable()->assertJsonValidationErrors(['items.0.selections']);

    $this->postJson('/api/v1/orders', validOrderPayload([
        'items' => [[
            'sku' => 'BRG-001',
            'quantity' => 1,
            'note' => '',
            'selections' => [
                ['groupId' => 'size', 'valueId' => 'not-a-size'],
            ],
        ]],
    ]), orderHeaders())->assertUnprocessable()->assertJsonValidationErrors(['items.0.selections.0.valueId']);

    $this->postJson('/api/v1/orders', validOrderPayload([
        'items' => [[
            'sku' => 'BRG-001',
            'quantity' => 1,
            'note' => '',
            'selections' => [
                ['groupId' => 'size', 'valueId' => 'regular'],
                ['groupId' => 'size', 'valueId' => 'regular'],
            ],
        ]],
    ]), orderHeaders())->assertUnprocessable()->assertJsonValidationErrors(['items.0.selections.1.valueId']);

    $this->assertDatabaseCount('orders', 0);
});

it('rejects a payment method disabled in system settings', function () {
    DB::table('system_settings')->where('id', 1)->update(['card_payment_enabled' => false]);

    $this->postJson('/api/v1/orders', validOrderPayload(), orderHeaders())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method']);

    $this->assertDatabaseCount('orders', 0);
});

it('returns the original order when a lost response is retried with the same key and payload', function () {
    $idempotencyKey = (string) Str::uuid();
    $payload = validOrderPayload();

    $first = $this->postJson('/api/v1/orders', $payload, orderHeaders($idempotencyKey))
        ->assertCreated()
        ->assertHeader('Idempotency-Replayed', 'false');

    DB::table('products')->where('sku', 'BRG-001')->update(['available' => false]);

    $replay = $this->postJson('/api/v1/orders', $payload, orderHeaders($idempotencyKey))
        ->assertOk()
        ->assertHeader('Idempotency-Replayed', 'true');

    expect($replay->json('order.id'))->toBe($first->json('order.id'))
        ->and($replay->json('order.order_number'))->toBe($first->json('order.order_number'))
        ->and($replay->json('order.total_minor'))->toBe($first->json('order.total_minor'));
    $this->assertDatabaseCount('orders', 1);
    $this->assertDatabaseCount('order_items', 1);
});

it('rejects reuse of an idempotency key with a different payload', function () {
    $idempotencyKey = (string) Str::uuid();

    $this->postJson('/api/v1/orders', validOrderPayload(), orderHeaders($idempotencyKey))->assertCreated();

    $changedPayload = validOrderPayload();
    $changedPayload['items'][0]['quantity'] = 3;
    $this->postJson('/api/v1/orders', $changedPayload, orderHeaders($idempotencyKey))
        ->assertConflict()
        ->assertJsonPath('message', 'The idempotency key has already been used for a different order.');

    $this->assertDatabaseCount('orders', 1);
    $this->assertDatabaseHas('order_items', ['quantity' => 2]);
});

it('requires a valid idempotency key', function () {
    $this->postJson('/api/v1/orders', validOrderPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['idempotency_key']);

    $this->postJson('/api/v1/orders', validOrderPayload(), orderHeaders('not-a-uuid'))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['idempotency_key']);

    $this->assertDatabaseCount('orders', 0);
});

it('enforces one order per idempotency key at the database boundary', function () {
    $idempotencyKey = (string) Str::uuid();
    $this->postJson('/api/v1/orders', validOrderPayload(), orderHeaders($idempotencyKey))->assertCreated();

    $duplicate = (array) DB::table('orders')->first();
    unset($duplicate['id']);
    $duplicate['order_number'] = 'CONCURRENT-DUPLICATE';

    expect(fn () => DB::table('orders')->insert($duplicate))
        ->toThrow(UniqueConstraintViolationException::class);
    $this->assertDatabaseCount('orders', 1);
});
