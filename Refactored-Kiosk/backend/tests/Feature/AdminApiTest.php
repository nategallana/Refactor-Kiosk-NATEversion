<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('authenticates an administrator and returns a protected dashboard', function () {
    User::factory()->create([
        'email' => 'admin@example.test', 'password' => Hash::make('correct-password'), 'role' => 'admin',
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
