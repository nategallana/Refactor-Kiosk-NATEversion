<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $orders = DB::table('orders')->where('store_id', $storeId)->where('placed_at', '>=', now()->startOfDay());

        return response()->json([
            'summary' => [
                'sales_minor' => (clone $orders)
                    ->whereNotIn('fulfillment_status', ['pending', 'cancelled'])
                    ->where('payment_status', 'paid')
                    ->sum('total_minor'),
                'orders' => (clone $orders)->count(),
                'active_orders' => (clone $orders)->whereNotIn('fulfillment_status', ['completed', 'cancelled'])->count(),
                'available_products' => DB::table('products')->where('store_id', $storeId)->where('active', true)->where('available', true)->count(),
            ],
            'recent_orders' => DB::table('orders')->where('store_id', $storeId)->orderByDesc('placed_at')->limit(6)->get(),
        ]);
    }
}
