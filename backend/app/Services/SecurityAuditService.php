<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class SecurityAuditService
{
    /**
     * Keys that must never be recorded in audit logs.
     */
    private static array $sensitiveKeys = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'plaintexttoken',
        'auth_token',
        'token_hash',
        'wbox_auth_token',
        'wbox_auth_token_encrypted',
        'secret',
        'totp_secret',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    public static function log(
        string $action,
        string $entityType,
        string $entityId,
        ?int $actorId = null,
        ?array $before = null,
        ?array $after = null
    ): void {
        $sanitizedBefore = $before ? self::sanitize($before) : null;
        $sanitizedAfter = $after ? self::sanitize($after) : null;

        DB::table('audit_logs')->insert([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => (string) $entityId,
            'before' => $sanitizedBefore ? json_encode($sanitizedBefore) : null,
            'after' => $sanitizedAfter ? json_encode($sanitizedAfter) : null,
            'created_at' => now(),
        ]);
    }

    public static function sanitize(array $data): array
    {
        $cleaned = [];
        foreach ($data as $key => $value) {
            if (in_array(strtolower((string) $key), self::$sensitiveKeys, true)) {
                $cleaned[$key] = '[REDACTED]';
            } elseif (is_array($value)) {
                $cleaned[$key] = self::sanitize($value);
            } else {
                $cleaned[$key] = $value;
            }
        }

        return $cleaned;
    }
}
