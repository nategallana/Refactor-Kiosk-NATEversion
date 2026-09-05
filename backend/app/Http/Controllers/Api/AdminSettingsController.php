<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $storeId = (int) ($request->attributes->get('store_id') ?? 1);

        return response()->json(['settings' => $this->settings($storeId)]);
    }

    public function publicShow(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id') ?? 1);

        return response()->json(['settings' => DB::table('system_settings')->where('id', $storeId)->first() ?? DB::table('system_settings')->where('id', 1)->first()]);
    }

    public function update(Request $request): JsonResponse
    {
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
            'welcome_background_url' => ['sometimes', 'nullable', 'string'],
            'welcome_background_image' => ['sometimes', 'nullable', 'string', 'max:500'],
            'wbox_enabled' => ['sometimes', 'boolean'],
            'wbox_request_path' => ['sometimes', 'nullable', 'string', 'max:512'],
            'wbox_response_path' => ['sometimes', 'nullable', 'string', 'max:512'],
            'wbox_kiosk_number' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_version' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_pdaver' => ['sometimes', 'required', 'string', 'max:64'],
            'wbox_server' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_device' => ['sometimes', 'required', 'string', 'max:64'],
            'wbox_product' => ['sometimes', 'required', 'string', 'max:32'],
            'wbox_auth_token' => ['sometimes', 'nullable', 'string', 'max:2048'],
            'wbox_response_filename' => ['sometimes', 'required', 'string', 'max:128'],
            'wbox_retry_seconds' => ['sometimes', 'required', 'integer', 'min:5', 'max:3600'],
        ]);

        if (! $data['counter_payment_enabled'] && ! $data['card_payment_enabled']) {
            return response()->json([
                'message' => 'At least one payment method must remain enabled.',
                'errors' => ['payment_methods' => ['Enable counter or card payments.']],
            ], 422);
        }

        $before = $this->settings();
        DB::table('system_settings')->updateOrInsert(
            ['id' => 1],
            [...$data, 'updated_at' => now(), 'created_at' => $before?->created_at ?? now()],
        );
        DB::table('audit_logs')->insert([
            'actor_id' => $request->user()->id,
            'action' => 'settings.updated',
            'entity_type' => 'system_settings',
            'entity_id' => '1',
            'before' => $before ? json_encode($before) : null,
            'after' => json_encode($data),
            'created_at' => now(),
        ]);

        return response()->json(['settings' => $this->settings()]);
    }

    public function uploadBackground(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'image', 'max:10240'],
        ]);

        $path = $request->file('image')->store('backgrounds', 'public');
        $url = '/storage/' . $path;

        return response()->json(['url' => $url]);
    }

    public function wboxStatus(Request $request): JsonResponse
    {
        $settings = $this->settings();
        $requestPath = $settings?->wbox_request_path;
        $responsePath = $settings?->wbox_response_path;

        $requestExists = ! empty($requestPath) && is_dir($requestPath);
        $requestWritable = $requestExists && is_writable($requestPath);

        $responseExists = ! empty($responsePath) && is_dir($responsePath);
        $responseReadable = $responseExists && is_readable($responsePath);

        $credentialsConfigured = ! empty($settings?->wbox_auth_token) || (bool) ($settings?->wbox_enabled ?? false);

        return response()->json([
            'connection' => [
                'request_path' => [
                    'path' => $requestPath,
                    'exists' => (bool) $requestExists,
                    'writable' => (bool) $requestWritable,
                ],
                'response_path' => [
                    'path' => $responsePath,
                    'exists' => (bool) $responseExists,
                    'readable' => (bool) $responseReadable,
                ],
                'credentials_configured' => (bool) $credentialsConfigured,
            ],
        ]);
    }

    private function settings(int $storeId = 1): ?object
    {
        return DB::table('system_settings')->where('id', $storeId)->first() ?? DB::table('system_settings')->where('id', 1)->first();
    }
}
