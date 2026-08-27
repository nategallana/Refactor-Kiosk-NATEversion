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
            'terminal_id' => ['required', 'string', 'max:64', 'regex:/^[A-Z0-9][A-Z0-9\-]{0,63}$/i'],
            'name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'store_id' => ['required', 'integer', 'exists:stores,id'],
            'wbox_kiosk_number' => ['nullable', 'string', 'max:32', 'regex:/^[A-Z0-9][A-Z0-9_-]*$/i'],
        ]);

        $plainToken = Str::random(64);

        if (DB::table('terminals')->where('id', $data['terminal_id'])->exists()) {
            DB::table('terminals')->where('id', $data['terminal_id'])->update([
                'name' => $data['name'],
                'location' => $data['location'] ?? null,
                'store_id' => $data['store_id'],
                'wbox_kiosk_number' => $data['wbox_kiosk_number'] ?? $data['terminal_id'],
                'api_token' => hash('sha256', $plainToken),
                'status' => 'online',
                'updated_at' => now(),
            ]);

            return response()->json([
                'terminal_id' => $data['terminal_id'],
                'api_token' => $plainToken,
                'message' => 'Terminal registered successfully.',
            ], 200);
        }

        DB::table('terminals')->insert([
            'id' => $data['terminal_id'],
            'name' => $data['name'],
            'location' => $data['location'] ?? null,
            'store_id' => $data['store_id'],
            'wbox_kiosk_number' => $data['wbox_kiosk_number'] ?? $data['terminal_id'],
            'api_token' => hash('sha256', $plainToken),
            'status' => 'online',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'terminal_id' => $data['terminal_id'],
            'api_token' => $plainToken,
            'message' => 'Terminal registered. Store the API token securely — it will not be shown again.',
        ], 201);
    }

    /**
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
