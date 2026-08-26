<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCatalogController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = DB::table('categories')->orderBy('display_order')->get();

        $products = DB::table('products')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->select('products.*', 'categories.name as category_name')
            ->orderBy('products.name')
            ->get()
            ->map(function (object $product): object {
                $product->option_groups = json_decode($product->option_groups_json ?? '[]', false, 512, JSON_THROW_ON_ERROR);
                unset($product->option_groups_json);
                return $product;
            });

        return response()->json(compact('categories', 'products'));
    }

    public function availability(Request $request, int $product): JsonResponse
    {
        $data = $request->validate(['available' => ['required', 'boolean']]);
        $before = DB::table('products')->where('id', $product)->firstOrFail();
        DB::table('products')->where('id', $product)->update(['available' => $data['available'], 'updated_at' => now()]);
        DB::table('audit_logs')->insert([
            'actor_id' => $request->user()->id, 'action' => 'product.availability_changed',
            'entity_type' => 'product', 'entity_id' => (string) $product,
            'before' => json_encode(['available' => (bool) $before->available]),
            'after' => json_encode(['available' => $data['available']]), 'created_at' => now(),
        ]);

        return response()->json(['product' => DB::table('products')->where('id', $product)->first()]);
    }
}
