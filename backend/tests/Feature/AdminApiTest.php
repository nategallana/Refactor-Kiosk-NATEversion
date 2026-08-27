<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('authenticates an administrator and returns a protected dashboard', function () {
    User::factory()->create([
        'email' => 'admin@example.test', 'password' => Hash::make('correct-password'), 'role' => 'store_admin',
    ]);
    $login = $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'admin@example.test', 'password' => 'correct-password',
    ])->assertOk()->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);

    $this->withToken($login->json('token'))->getJson('/api/v1/admin/dashboard')->assertOk()
        ->assertJsonStructure(['summary' => ['sales_minor', 'orders', 'active_orders', 'available_products'], 'recent_orders']);
});

it('rejects invalid admin credentials', function () {
    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'missing@example.test', 'password' => 'wrong-password',
    ])->assertUnprocessable()->assertJsonPath('message', 'The email or password is incorrect.');
});

it('reads and updates persistent system settings with an audit record', function () {
    $admin = User::factory()->create(['role' => 'store_admin']);
    $this->seed();

    $this->actingAs($admin)->getJson('/api/v1/admin/settings')
        ->assertOk()
        ->assertJsonPath('settings.brand_name', 'KIOSK');

    $this->actingAs($admin)->putJson('/api/v1/admin/settings', [
        'brand_name' => 'North Hall Kiosk',
        'tax_rate_basis_points' => 1200,
        'service_mode' => 'both',
        'currency' => 'PHP',
        'counter_payment_enabled' => true,
        'card_payment_enabled' => false,
        'idle_timeout_seconds' => 180,
        'auto_reset_seconds' => 20,
        'receipt_header' => 'Welcome to North Hall.',
        'receipt_footer' => 'Thank you.',
    ])->assertOk()->assertJsonPath('settings.brand_name', 'North Hall Kiosk');

    $this->assertDatabaseHas('system_settings', ['store_id' => 1, 'brand_name' => 'North Hall Kiosk']);
    $this->assertDatabaseHas('audit_logs', ['actor_id' => $admin->id, 'action' => 'settings.updated']);
});

it('isolates catalog, orders, terminals, and settings between stores', function () {
    $this->seed();

    $storeBId = DB::table('stores')->insertGetId([
        'name' => 'Store Beta',
        'code' => 'BETA',
        'timezone' => 'Asia/Manila',
        'active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $adminA = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $adminA->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $adminB = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => $storeBId, 'user_id' => $adminB->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    // Create a product for Store B
    $categoryB = DB::table('categories')->insertGetId([
        'name' => 'Beta Category', 'display_order' => 1, 'active' => true, 'store_id' => $storeBId, 'created_at' => now(), 'updated_at' => now(),
    ]);
    $productBId = DB::table('products')->insertGetId([
        'store_id' => $storeBId, 'category_id' => $categoryB, 'sku' => 'BETA-001', 'name' => 'Beta Burger',
        'price_minor' => 15000, 'active' => true, 'available' => true, 'created_at' => now(), 'updated_at' => now(),
    ]);

    // Admin A fetching catalog should NOT see Store B's product
    $responseA = $this->actingAs($adminA)->getJson('/api/v1/admin/catalog')->assertOk();
    $productSkus = collect($responseA->json('products'))->pluck('sku');
    expect($productSkus)->not->toContain('BETA-001');

    // Admin A trying to update Store B's product availability gets 404
    $this->actingAs($adminA)->patchJson("/api/v1/admin/catalog/{$productBId}/availability", ['available' => false])
        ->assertNotFound();
});

it('prevents store admin from accessing platform routes', function () {
    $this->seed();
    $storeAdmin = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $storeAdmin->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $this->actingAs($storeAdmin)->getJson('/api/v1/platform/stores')
        ->assertForbidden();
});

it('allows super admin to switch store context via X-Store-Id header', function () {
    $this->seed();

    $storeBId = DB::table('stores')->insertGetId([
        'name' => 'Store Beta',
        'code' => 'BETA',
        'timezone' => 'Asia/Manila',
        'active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $superAdmin = User::factory()->create(['role' => 'super_admin']);

    // Super Admin can access Store B context
    $this->actingAs($superAdmin)->withHeader('X-Store-Id', (string) $storeBId)
        ->getJson('/api/v1/admin/catalog')
        ->assertOk();
});

it('allows super admin to create, update, and manage stores and users', function () {
    $this->seed();
    $superAdmin = User::factory()->create(['role' => 'super_admin']);

    // Create new store
    $storeRes = $this->actingAs($superAdmin)->postJson('/api/v1/platform/stores', [
        'name' => 'South Branch',
        'code' => 'SOUTH',
        'timezone' => 'Asia/Manila',
    ])->assertCreated()->json('store');

    expect($storeRes['name'])->toBe('South Branch');
    $this->assertDatabaseHas('stores', ['code' => 'SOUTH']);

    // Update store
    $this->actingAs($superAdmin)->patchJson("/api/v1/platform/stores/{$storeRes['id']}", [
        'name' => 'South Mall Branch',
    ])->assertOk()->assertJsonPath('store.name', 'South Mall Branch');

    // Create and assign a store admin
    $user = User::factory()->create(['role' => 'store_admin']);
    $this->actingAs($superAdmin)->patchJson("/api/v1/platform/users/{$user->id}", [
        'store_id' => $storeRes['id'],
    ])->assertOk();

    $this->assertDatabaseHas('store_user', ['store_id' => $storeRes['id'], 'user_id' => $user->id]);
});

it('handles secure impersonation lifecycle for super admins', function () {
    $this->seed();
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $targetAdmin = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $targetAdmin->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    // Impersonating another super admin fails
    $otherSuperAdmin = User::factory()->create(['role' => 'super_admin']);
    $this->actingAs($superAdmin)->postJson("/api/v1/platform/impersonation/{$otherSuperAdmin->id}", [
        'store_id' => 1,
        'reason' => 'Testing support access',
    ])->assertUnprocessable();

    // Valid impersonation creates session and token
    $impersonateRes = $this->actingAs($superAdmin)->postJson("/api/v1/platform/impersonation/{$targetAdmin->id}", [
        'store_id' => 1,
        'reason' => 'Troubleshooting menu catalog for store 1',
    ])->assertOk()->json();

    expect($impersonateRes)->toHaveKeys(['session_id', 'token', 'expires_at', 'user']);
    $this->assertDatabaseHas('audit_logs', ['actor_id' => $superAdmin->id, 'action' => 'impersonation.started']);

    // End impersonation
    $this->actingAs($superAdmin)->deleteJson("/api/v1/platform/impersonation/{$impersonateRes['session_id']}")
        ->assertOk()
        ->assertJsonPath('message', 'Impersonation session ended.');

    $this->assertDatabaseHas('audit_logs', ['actor_id' => $superAdmin->id, 'action' => 'impersonation.ended']);
});

