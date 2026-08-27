<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');

        return response()->json(['settings' => $this->settings($storeId)]);
    }

    public function publicShow(Request $request): JsonResponse
    {
        $storeId = (int) ($request->attributes->get('store_id') ?: 1);

        return response()->json(['settings' => DB::table('system_settings')->where('store_id', $storeId)->first([
            'id',
            'store_id',
            'brand_name',
            'tax_rate_basis_points',
            'service_mode',
            'currency',
            'counter_payment_enabled',
            'card_payment_enabled',
            'idle_timeout_seconds',
            'auto_reset_seconds',
            'receipt_header',
            'receipt_footer',
            'created_at',
            'updated_at',
        ]) ?? DB::table('system_settings')->where('id', 1)->first([
            'id',
            'store_id',
            'brand_name',
            'tax_rate_basis_points',
            'service_mode',
            'currency',
            'counter_payment_enabled',
            'card_payment_enabled',
            'idle_timeout_seconds',
            'auto_reset_seconds',
            'receipt_header',
            'receipt_footer',
            'created_at',
            'updated_at',
        ])]);
    }

    public function update(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $data = $request->validate([
            'brand_name' => ['required', 'string', 'max:80'],
            'tax_rate_basis_points' => ['required', 'integer', 'min:0', 'max:10000'],
            'service_mode' => ['required', Rule::in(['dine-in', 'takeout', 'both'])],
            'currency' => ['required', Rule::in(['PHP'])],
            'counter_payment_enabled' => ['required', 'boolean'],
            'card_payment_enabled' => ['required', 'boolean'],
            'idle_timeout_seconds' => ['required', 'integer', 'min:30', 'max:1800'],
            'auto_reset_seconds' => ['required', 'integer', 'min:5', 'max:300'],
            'receipt_header' => ['nullable', 'string', 'max:120'],
            'receipt_footer' => ['nullable', 'string', 'max:240'],
            'wbox_enabled' => ['sometimes', 'boolean'],
            'wbox_request_path' => ['sometimes', 'nullable', 'string', 'max:512'],
            'wbox_response_path' => ['sometimes', 'nullable', 'string', 'max:512'],
            'wbox_kiosk_number' => ['sometimes', 'required', 'string', 'max:32', 'regex:/^[A-Za-z0-9_-]+$/'],
            'wbox_version' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_pdaver' => ['sometimes', 'required', 'string', 'max:64'],
            'wbox_server' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_device' => ['sometimes', 'required', 'string', 'max:64'],
            'wbox_product' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_auth_token' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'wbox_response_filename' => ['sometimes', 'required', 'string', 'max:128', 'regex:~^[^\\\\/]+$~'],
            'wbox_retry_seconds' => ['sometimes', 'required', 'integer', 'min:5', 'max:3600'],
        ]);

        if (! $data['counter_payment_enabled'] && ! $data['card_payment_enabled']) {
            return response()->json([
                'message' => 'At least one payment method must remain enabled.',
                'errors' => ['payment_methods' => ['Enable counter or card payments.']],
            ], 422);
        }

        $beforeRecord = DB::table('system_settings')->where('store_id', $storeId)->first() ?? DB::table('system_settings')->where('id', 1)->first();
        $before = $this->settings($storeId);
        $effectiveWboxEnabled = (bool) ($data['wbox_enabled'] ?? $beforeRecord?->wbox_enabled ?? false);
        $effectiveRequestPath = $data['wbox_request_path'] ?? $beforeRecord?->wbox_request_path;
        $effectiveResponsePath = $data['wbox_response_path'] ?? $beforeRecord?->wbox_response_path;
        $newToken = trim((string) ($data['wbox_auth_token'] ?? ''));
        if ($effectiveWboxEnabled && (! filled($effectiveRequestPath) || ! filled($effectiveResponsePath))) {
            return response()->json([
                'message' => 'WBOX request and response folders are required when integration is enabled.',
                'errors' => ['wbox_paths' => ['Configure both WBOX folders.']],
            ], 422);
        }
        if ($effectiveWboxEnabled && $newToken === '' && ! filled($beforeRecord?->wbox_auth_token_encrypted)) {
            return response()->json([
                'message' => 'A WBOX authentication token is required when integration is enabled.',
                'errors' => ['wbox_auth_token' => ['Enter the WBOX authentication token.']],
            ], 422);
        }

        unset($data['wbox_auth_token']);
        if ($newToken !== '') {
            $data['wbox_auth_token_encrypted'] = Crypt::encryptString($newToken);
        }
        DB::table('system_settings')->updateOrInsert(
            ['store_id' => $storeId],
            [...$data, 'store_id' => $storeId, 'updated_at' => now(), 'created_at' => $before?->created_at ?? now()],
        );
        DB::table('audit_logs')->insert([
            'actor_id' => $request->user()->id,
            'action' => 'settings.updated',
            'entity_type' => 'system_settings',
            'entity_id' => (string) $storeId,
            'before' => $before ? json_encode($before) : null,
            'after' => json_encode($this->auditSettings($data, $newToken !== '')),
            'created_at' => now(),
        ]);

        return response()->json(['settings' => $this->settings($storeId)]);
    }

    private function settings(int $storeId = 1): ?object
    {
        $settings = DB::table('system_settings')->where('store_id', $storeId)->first() ?? DB::table('system_settings')->where('id', 1)->first();
        if ($settings === null) {
            return null;
        }

        $settings->wbox_auth_token_configured = filled($settings->wbox_auth_token_encrypted);
        unset($settings->wbox_auth_token_encrypted);

        return $settings;
    }

    private function auditSettings(array $data, bool $tokenChanged): array
    {
        unset($data['wbox_auth_token_encrypted']);
        if ($tokenChanged) {
            $data['wbox_auth_token'] = '[updated]';
        }

        return $data;
    }
}
