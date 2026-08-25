<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_number' => ['required', 'string'],
            'terminal_id' => ['nullable', 'string'],
            'dining_type' => ['required', 'string'],
            'payment_method' => ['required', 'string'],
            'subtotal_minor' => ['required', 'integer'],
            'tax_minor' => ['required', 'integer'],
            'total_minor' => ['required', 'integer'],
        ]);

        $rawItems = $request->input('items', $request->input('items_json', null));
        if (is_array($rawItems)) {
            $itemsJson = json_encode($rawItems);
        } elseif (is_string($rawItems)) {
            $itemsJson = $rawItems;
        } else {
            $itemsJson = null;
        }

        $orderId = DB::table('orders')->insertGetId([
            'order_number' => $data['order_number'],
            'terminal_id' => $data['terminal_id'] ?? 'KIOSK-01',
            'dining_type' => $data['dining_type'],
            'subtotal_minor' => $data['subtotal_minor'],
            'tax_minor' => $data['tax_minor'],
            'total_minor' => $data['total_minor'],
            'items_json' => $itemsJson,
            'payment_status' => $data['payment_method'] === 'card' ? 'paid' : 'pending',
            'fulfillment_status' => 'pending',
            'placed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $order = DB::table('orders')->where('id', $orderId)->first();

        return response()->json(['order' => $order], 201);
    }
}