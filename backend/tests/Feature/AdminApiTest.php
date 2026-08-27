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

    $this->assertDatabaseHas('system_settings', ['id' => 1, 'brand_name' => 'North Hall Kiosk']);
    $this->assertDatabaseHas('audit_logs', ['actor_id' => $admin->id, 'action' => 'settings.updated']);
});
