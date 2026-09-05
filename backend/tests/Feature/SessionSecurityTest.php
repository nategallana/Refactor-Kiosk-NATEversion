<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class)->group('pending-integration');

beforeEach(function () {
    $this->seed();
});

it('enforces 30-minute access token expiration', function () {
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $tokenObj = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));
    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // Expire token
    $tokenObj->accessToken->forceFill(['expires_at' => now()->subMinutes(1)])->save();
    $this->app['auth']->forgetGuards();

    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();
});

it('enforces 15-minute idle timeout on inactive sessions', function () {
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $tokenObj = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));

    // First request establishes activity
    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // Simulate 16 minutes idle
    Cache::put("token_activity:{$tokenObj->accessToken->id}", now()->subMinutes(16)->toIso8601String());
    $this->app['auth']->forgetGuards();

    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Session timed out due to 15 minutes of inactivity.');
});

it('enforces 8-hour maximum session limit', function () {
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $tokenObj = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));

    // First request
    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // Directly update created_at to 9 hours ago in DB
    DB::table('personal_access_tokens')->where('id', $tokenObj->accessToken->id)->update([
        'created_at' => now()->subHours(9),
    ]);
    $this->app['auth']->forgetGuards();

    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Session exceeded maximum duration of 8 hours. Please sign in again.');
});

it('enforces 30-minute impersonation session expiration', function () {
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $targetAdmin = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $targetAdmin->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $impersonateRes = $this->actingAs($superAdmin)->postJson("/api/v1/platform/impersonation/{$targetAdmin->id}", [
        'store_id' => 1,
        'reason' => 'Verifying session timeout rule',
    ])->assertOk()->json();

    // Valid impersonation token
    $this->app['auth']->forgetGuards();
    $this->withToken($impersonateRes['token'])->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // Expire the token
    $token = $targetAdmin->tokens()->where('name', 'impersonation-'.$impersonateRes['session_id'])->first();
    $token->forceFill(['expires_at' => now()->subMinutes(1)])->save();
    $this->app['auth']->forgetGuards();

    $this->withToken($impersonateRes['token'])->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();
});

it('lists active sessions with IP, user-agent, and allows session revocation', function () {
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $loginRes = $this->postJson('/api/v1/admin/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ], ['User-Agent' => 'Mozilla/5.0 Chrome/120.0'])->assertOk()->json();

    $sessions = $this->withToken($loginRes['token'])->getJson('/api/v1/admin/sessions')
        ->assertOk()
        ->assertJsonStructure(['sessions' => [['id', 'ip_address', 'user_agent', 'last_activity_at', 'is_current']]])
        ->json('sessions');

    expect($sessions)->toHaveCount(1)
        ->and($sessions[0]['user_agent'])->toBe('Mozilla/5.0 Chrome/120.0')
        ->and($sessions[0]['is_current'])->toBeTrue();

    // Revoke session
    $this->withToken($loginRes['token'])->deleteJson("/api/v1/admin/sessions/{$sessions[0]['id']}")
        ->assertOk()
        ->assertJsonPath('message', 'Session revoked.');

    // Next request with same token fails
    $this->app['auth']->forgetGuards();
    $this->withToken($loginRes['token'])->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();
});

it('auto-revokes sessions on password change, role change, and store deactivation', function () {
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    $tokenObj = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));

    // 1. Password change auto-revokes existing tokens
    $changeRes = $this->withToken($tokenObj->plainTextToken)->postJson('/api/v1/admin/password/change', [
        'current_password' => 'password',
        'password' => 'NewSecurePassword123!',
        'password_confirmation' => 'NewSecurePassword123!',
    ])->assertOk()->json();

    // Old token fails
    $this->app['auth']->forgetGuards();
    $this->withToken($tokenObj->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();

    // New token succeeds
    $this->app['auth']->forgetGuards();
    $this->withToken($changeRes['token'])->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // 2. Super Admin role/store change auto-revokes tokens
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $this->actingAs($superAdmin)->patchJson("/api/v1/platform/users/{$user->id}", [
        'role' => 'super_admin',
    ])->assertOk();

    // User's previous token fails due to role change
    $this->app['auth']->forgetGuards();
    $this->withToken($changeRes['token'])->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();

    // 3. Store deactivation auto-revokes all store user tokens
    $storeUser = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $storeUser->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);
    $storeUserToken = $storeUser->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));

    // Verify token works
    $this->app['auth']->forgetGuards();
    $this->withToken($storeUserToken->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertOk();

    // Deactivate store
    $this->actingAs($superAdmin)->patchJson('/api/v1/platform/stores/1', [
        'active' => false,
    ])->assertOk();

    // Store user's token is immediately revoked
    $this->app['auth']->forgetGuards();
    $this->withToken($storeUserToken->plainTextToken)->getJson('/api/v1/admin/dashboard')
        ->assertUnauthorized();
});

