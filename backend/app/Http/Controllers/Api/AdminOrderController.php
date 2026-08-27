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

    public function index(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');

        return response()->json(['orders' => $this->orders($storeId)->orderByDesc('orders.placed_at')->get()]);
    }

    public function updateStatus(Request $request, int $order): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $data = $request->validate(['status' => ['required', Rule::in(self::STATUSES)]]);
        $before = DB::table('orders')->where('id', $order)->where('store_id', $storeId)->firstOrFail();
        DB::transaction(function () use ($request, $order, $storeId, $before, $data): void {
            $updates = [
                'fulfillment_status' => $data['status'],
                'updated_at' => now(),
            ];
            if (in_array($data['status'], ['confirmed', 'preparing', 'ready', 'completed']) && $before->payment_status === 'pending') {
                $updates['payment_status'] = 'paid';
            }
            DB::table('orders')->where('id', $order)->where('store_id', $storeId)->update($updates);
            DB::table('audit_logs')->insert([
                'actor_id' => $request->user()->id, 'action' => 'order.status_changed',
                'entity_type' => 'order', 'entity_id' => (string) $order,
                'before' => json_encode(['fulfillment_status' => $before->fulfillment_status, 'payment_status' => $before->payment_status]),
                'after' => json_encode(['fulfillment_status' => $data['status'], 'payment_status' => $updates['payment_status'] ?? $before->payment_status]),
                'created_at' => now(),
            ]);
        });

        return response()->json(['order' => $this->orders($storeId)->where('orders.id', $order)->first()]);
    }

    private function orders(int $storeId)
    {
        return DB::table('orders')
            ->where('orders.store_id', $storeId)
            ->leftJoin('wbox_exports', 'wbox_exports.order_id', '=', 'orders.id')
            ->select(
                'orders.*',
                'wbox_exports.status as wbox_status',
                'wbox_exports.attempt_count as wbox_attempt_count',
                'wbox_exports.request_filename as wbox_request_filename',
                'wbox_exports.response_success as wbox_response_success',
                'wbox_exports.response_message as wbox_response_message',
                'wbox_exports.last_error as wbox_last_error',
                'wbox_exports.sent_at as wbox_sent_at',
                'wbox_exports.acknowledged_at as wbox_acknowledged_at',
            );
    }
}
