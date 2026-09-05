<?php

use App\Models\User;
use App\Services\SecurityAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class)->group('pending-integration');

beforeEach(function () {
    $this->seed();
    RateLimiter::clear('login');
    RateLimiter::clear('super_admin_login');
    RateLimiter::clear('impersonation');
    RateLimiter::clear('terminal_registration');
    RateLimiter::clear('wbox_retry');
});

it('enforces login rate limit of 10 attempts per minute per IP', function () {
    for ($i = 0; $i < 10; $i++) {
        $this->postJson('/api/v1/admin/auth/login', [
            'email' => 'admin@kiosk.local',
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    // 11th attempt is rate-limited
    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'admin@kiosk.local',
        'password' => 'wrong-password',
    ])->assertStatus(429);
});

it('enforces terminal registration rate limit of 5 per minute per IP', function () {
    $admin = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $admin->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);
    $token = $admin->createToken('admin-dashboard', ['admin'], now()->addMinutes(30))->plainTextToken;

    for ($i = 1; $i <= 5; $i++) {
        $this->withToken($token)->postJson('/api/v1/admin/terminals', [
            'terminal_id' => "KIOSK-RATE-{$i}",
            'name' => "Rate Terminal {$i}",
        ])->assertCreated();
    }

    // 6th attempt is throttled
    $this->withToken($token)->postJson('/api/v1/admin/terminals', [
        'terminal_id' => 'KIOSK-RATE-6',
        'name' => 'Rate Terminal 6',
    ])->assertStatus(429);
});

it('enforces impersonation rate limit of 10 per hour per user', function () {
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $storeAdmin = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $storeAdmin->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    for ($i = 0; $i < 10; $i++) {
        $this->actingAs($superAdmin)->postJson("/api/v1/platform/impersonation/{$storeAdmin->id}", [
            'store_id' => 1,
            'reason' => "Security check {$i}",
        ])->assertOk();
    }

    // 11th attempt is throttled
    $this->actingAs($superAdmin)->postJson("/api/v1/platform/impersonation/{$storeAdmin->id}", [
        'store_id' => 1,
        'reason' => 'Rate limit overflow',
    ])->assertStatus(429);
});

it('logs security events and strictly redacts passwords, tokens, and secret keys', function () {
    // 1. Log failed login
    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'admin@kiosk.local',
        'password' => 'SecretPass123!',
    ])->assertStatus(422);

    $failedLog = DB::table('audit_logs')->where('action', 'auth.login.failed')->first();
    expect($failedLog)->not->toBeNull()
        ->and($failedLog->after)->not->toContain('SecretPass123!')
        ->and($failedLog->after)->toContain('admin@kiosk.local');

    // 2. Successful login & session created
    $this->postJson('/api/v1/admin/auth/login', [
        'email' => 'admin@kiosk.local',
        'password' => 'Admin123!',
    ])->assertOk();

    expect(DB::table('audit_logs')->where('action', 'auth.login.success')->exists())->toBeTrue()
        ->and(DB::table('audit_logs')->where('action', 'session.created')->exists())->toBeTrue();

    // 3. Redaction service test
    $dataWithSecrets = [
        'user' => 'John',
        'password' => 'SuperSecret123',
        'token' => 'plain_bearer_123',
        'wbox_auth_token' => 'wbox_sec_456',
        'totp_secret' => 'base32secret',
        'nested' => [
            'auth_token' => 'secret_nested_token',
            'public_field' => 'visible',
        ],
    ];

    $sanitized = SecurityAuditService::sanitize($dataWithSecrets);
    expect($sanitized['password'])->toBe('[REDACTED]')
        ->and($sanitized['token'])->toBe('[REDACTED]')
        ->and($sanitized['wbox_auth_token'])->toBe('[REDACTED]')
        ->and($sanitized['totp_secret'])->toBe('[REDACTED]')
        ->and($sanitized['nested']['auth_token'])->toBe('[REDACTED]')
        ->and($sanitized['nested']['public_field'])->toBe('visible');
});

it('logs terminal registration, role change, and store deactivation events', function () {
    $superAdmin = User::factory()->create(['role' => 'super_admin']);
    $user = User::factory()->create(['role' => 'store_admin']);
    DB::table('store_user')->updateOrInsert(['store_id' => 1, 'user_id' => $user->id], ['role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);

    // Role change
    $this->actingAs($superAdmin)->patchJson("/api/v1/platform/users/{$user->id}", [
        'role' => 'super_admin',
    ])->assertOk();

    expect(DB::table('audit_logs')->where('action', 'role.changed')->exists())->toBeTrue();

    // Terminal registration and revocation on active Store 1
    $token = $superAdmin->createToken('admin-dashboard', ['admin'], now()->addMinutes(30))->plainTextToken;
    $this->withToken($token)->withHeader('X-Store-Id', '1')->postJson('/api/v1/admin/terminals', [
        'terminal_id' => 'KIOSK-AUDIT-01',
        'name' => 'Audit Terminal',
    ])->assertCreated();

    expect(DB::table('audit_logs')->where('action', 'terminal.registered')->exists())->toBeTrue();

    $this->withToken($token)->withHeader('X-Store-Id', '1')->deleteJson('/api/v1/admin/terminals/KIOSK-AUDIT-01')
        ->assertOk();

    expect(DB::table('audit_logs')->where('action', 'terminal.revoked')->exists())->toBeTrue();

    // Store disable
    $this->actingAs($superAdmin)->patchJson('/api/v1/platform/stores/1', [
        'active' => false,
    ])->assertOk();

    expect(DB::table('audit_logs')->where('action', 'store.disabled')->exists())->toBeTrue();
});
