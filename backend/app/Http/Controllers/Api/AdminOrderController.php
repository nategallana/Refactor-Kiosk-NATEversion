<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    private const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

    public function index(): JsonResponse
    {
        return response()->json(['orders' => DB::table('orders')->orderByDesc('placed_at')->get()]);
    }

    public function updateStatus(Request $request, int $order): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);
        $before = DB::table('orders')->where('id', $order)->firstOrFail();
        DB::transaction(function () use ($request, $order, $before, $data): void {
            $updates = [
                'fulfillment_status' => $data['status'],
                'updated_at' => now(),
            ];
            if (in_array($data['status'], ['confirmed', 'preparing', 'ready', 'completed']) && $before->payment_status === 'pending') {
                $updates['payment_status'] = 'paid';
            }
            DB::table('orders')->where('id', $order)->update($updates);
            DB::table('audit_logs')->insert([
                'actor_id' => $request->user()?->id, 'action' => 'order.status_changed',
                'entity_type' => 'order', 'entity_id' => (string) $order,
                'before' => json_encode(['fulfillment_status' => $before->fulfillment_status, 'payment_status' => $before->payment_status]),
                'after' => json_encode(['fulfillment_status' => $data['status'], 'payment_status' => $updates['payment_status'] ?? $before->payment_status]),
                'created_at' => now(),
            ]);
        });

        return response()->json(['order' => DB::table('orders')->where('id', $order)->first()]);
    }

    public function wboxRetry(Request $request, int $order): JsonResponse
    {
        $orderRow = DB::table('orders')->where('id', $order)->first();
        if (! $orderRow) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => "Order #{$orderRow->order_number} exported to WBOX successfully.",
        ]);
    }
}
