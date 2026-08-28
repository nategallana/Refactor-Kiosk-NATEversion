<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TerminalController extends Controller
{
    /**
     * Register a new terminal. Called once during kiosk setup.
     * No auth required (the terminal doesn't have a token yet).
     */
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'activation_code' => ['required', 'string', 'size:8', 'regex:/^[A-Z0-9]+$/i'],
            'name' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
        ]);
        $codeHash = hash('sha256', strtoupper($data['activation_code']));
        $plainToken = Str::random(64);
        $result = DB::transaction(function () use ($codeHash, $data, $plainToken): array {
            $activation = DB::table('terminal_activation_codes')->where('code_hash', $codeHash)->lockForUpdate()->first();
            if ($activation === null) abort(422, 'The activation code is invalid.');
            if ($activation->used_at !== null) abort(422, 'The activation code has already been used.');
            if (now()->greaterThan($activation->expires_at)) abort(422, 'The activation code has expired.');
            $terminalId = $activation->terminal_id ?: 'KIOSK-'.strtoupper(Str::random(6));
            if (DB::table('terminals')->where('id', $terminalId)->exists()) abort(409, 'This terminal is already registered. Ask the Store Admin for a new code.');
            DB::table('terminals')->insert([
                'id' => $terminalId, 'name' => $data['name'] ?? $terminalId, 'location' => $data['location'] ?? null,
                'store_id' => $activation->store_id, 'wbox_kiosk_number' => $terminalId,
                'api_token' => hash('sha256', $plainToken), 'status' => 'online', 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('terminal_activation_codes')->where('id', $activation->id)->update(['used_at' => now(), 'updated_at' => now()]);
            return [$terminalId, $activation->store_id];
        });
        return response()->json(['terminal_id' => $result[0], 'store_id' => $result[1], 'api_token' => $plainToken, 'message' => 'Terminal activated successfully.'], 201);
    }    /**
     * Heartbeat ping from an authenticated terminal.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal') ?? (object) $request->input('_terminal');

        if ($terminal === null || ! isset($terminal->id)) {
            return response()->json(['message' => 'Terminal authentication required.'], 401);
        }

        DB::table('terminals')->where('id', $terminal->id)->update([
            'last_heartbeat_at' => now(),
            'ip_address' => $request->ip(),
            'app_version' => $request->input('app_version'),
            'updated_at' => now(),
        ]);

        // Return current config so the terminal can react to changes
        $settings = DB::table('system_settings')->where('id', 1)->first();
        $fresh = DB::table('terminals')->where('id', $terminal->id)->first();

        return response()->json([
            'terminal' => [
                'id' => $fresh->id,
                'name' => $fresh->name,
                'status' => $fresh->status,
                'service_mode' => $fresh->service_mode ?? $settings->service_mode,
            ],
            'settings' => [
                'brand_name' => $settings->brand_name,
                'service_mode' => $fresh->service_mode ?? $settings->service_mode,
                'counter_payment_enabled' => (bool) $settings->counter_payment_enabled,
                'card_payment_enabled' => (bool) $settings->card_payment_enabled,
                'idle_timeout_seconds' => (int) $settings->idle_timeout_seconds,
                'auto_reset_seconds' => (int) $settings->auto_reset_seconds,
                'tax_rate_basis_points' => (int) $settings->tax_rate_basis_points,
            ],
        ]);
    }

    /**
     * Get terminal configuration (authenticated).
     */
    public function config(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal') ?? (object) $request->input('_terminal');

        if ($terminal === null || ! isset($terminal->id)) {
            return response()->json(['message' => 'Terminal authentication required.'], 401);
        }

        $settings = DB::table('system_settings')->where('id', 1)->first();

        return response()->json([
            'terminal' => [
                'id' => $terminal->id,
                'name' => $terminal->name,
                'status' => $terminal->status,
                'service_mode' => $terminal->service_mode ?? $settings->service_mode,
                'screen_profile' => $terminal->screen_profile,
            ],
            'settings' => [
                'brand_name' => $settings->brand_name,
                'service_mode' => $terminal->service_mode ?? $settings->service_mode,
                'counter_payment_enabled' => (bool) $settings->counter_payment_enabled,
                'card_payment_enabled' => (bool) $settings->card_payment_enabled,
                'idle_timeout_seconds' => (int) $settings->idle_timeout_seconds,
                'auto_reset_seconds' => (int) $settings->auto_reset_seconds,
                'receipt_header' => $settings->receipt_header,
                'receipt_footer' => $settings->receipt_footer,
                'tax_rate_basis_points' => (int) $settings->tax_rate_basis_points,
            ],
        ]);
    }
}
