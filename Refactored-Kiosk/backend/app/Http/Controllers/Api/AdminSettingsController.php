<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminSettingsController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['settings' => $this->settings()]);
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
            'welcome_background_image' => ['nullable', 'string', 'max:500'],
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

    private function settings(): ?object
    {
        return DB::table('system_settings')->where('id', 1)->first();
    }
}
