<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WboxBridge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminWboxController extends Controller
{
    public function status(WboxBridge $bridge): JsonResponse
    {
        return response()->json(['connection' => $bridge->connectionStatus()]);
    }

    public function retry(Request $request, int $order): JsonResponse
    {
        $orderRecord = DB::table('orders')->where('id', $order)->firstOrFail();
        $export = DB::table('wbox_exports')->where('order_id', $order)->first();
        if ($export !== null && in_array($export->status, ['processing', 'sent', 'acknowledged'], true)) {
            return response()->json(['message' => 'This order cannot be retried in its current WBOX state.'], 409);
        }

        DB::transaction(function () use ($request, $orderRecord, $export): void {
            DB::table('wbox_exports')->updateOrInsert(
                ['order_id' => $orderRecord->id],
                [
                    'status' => 'pending',
                    'response_hash' => null,
                    'response_success' => null,
                    'response_message' => null,
                    'last_error' => null,
                    'available_at' => now(),
                    'sent_at' => null,
                    'acknowledged_at' => null,
                    'created_at' => $export?->created_at ?? now(),
                    'updated_at' => now(),
                ],
            );
            DB::table('audit_logs')->insert([
                'actor_id' => $request->user()->id,
                'action' => 'wbox.export_retried',
                'entity_type' => 'order',
                'entity_id' => (string) $orderRecord->id,
                'before' => $export ? json_encode(['status' => $export->status, 'last_error' => $export->last_error]) : null,
                'after' => json_encode(['status' => 'pending']),
                'created_at' => now(),
            ]);
        });

        return response()->json(['export' => DB::table('wbox_exports')->where('order_id', $order)->first()]);
    }
}
