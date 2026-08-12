<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $orders = DB::table('orders')->where('placed_at', '>=', now()->startOfDay());

        return response()->json([
            'summary' => [
                'sales_minor' => (clone $orders)->where('payment_status', 'paid')->sum('total_minor'),
                'orders' => (clone $orders)->count(),
                'active_orders' => (clone $orders)->whereNotIn('fulfillment_status', ['completed', 'cancelled'])->count(),
                'available_products' => DB::table('products')->where('active', true)->where('available', true)->count(),
            ],
            'recent_orders' => DB::table('orders')->orderByDesc('placed_at')->limit(6)->get(),
        ]);
    }
}
