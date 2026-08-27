<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCatalogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id'));
        $categories = DB::table('categories')->where('store_id', $storeId)->orderBy('display_order')->get();

        $products = DB::table('products')
            ->where('products.store_id', $storeId)
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
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id'));
        $data = $request->validate(['available' => ['required', 'boolean']]);
        $before = DB::table('products')->where('id', $product)->where('store_id', $storeId)->firstOrFail();
        DB::table('products')->where('id', $product)->where('store_id', $storeId)->update(['available' => $data['available'], 'updated_at' => now()]);
        DB::table('audit_logs')->insert([
            'actor_id' => $request->user()->id, 'action' => 'product.availability_changed',
            'entity_type' => 'product', 'entity_id' => (string) $product,
            'before' => json_encode(['available' => (bool) $before->available]),
            'after' => json_encode(['available' => $data['available']]), 'created_at' => now(),
        ]);

        return response()->json(['product' => DB::table('products')->where('id', $product)->where('store_id', $storeId)->first()]);
    }

    public function wboxMapping(Request $request, int $product): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id'));
        $data = $request->validate([
            'wbox_item_code' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9._-]+$/'],
        ]);
        $before = DB::table('products')->where('id', $product)->where('store_id', $storeId)->firstOrFail();
        $code = filled($data['wbox_item_code'] ?? null) ? trim($data['wbox_item_code']) : null;

        DB::transaction(function () use ($request, $product, $storeId, $before, $code): void {
            DB::table('products')->where('id', $product)->where('store_id', $storeId)->update(['wbox_item_code' => $code, 'updated_at' => now()]);
            DB::table('audit_logs')->insert([
                'actor_id' => $request->user()->id,
                'action' => 'product.wbox_mapping_changed',
                'entity_type' => 'product',
                'entity_id' => (string) $product,
                'before' => json_encode(['wbox_item_code' => $before->wbox_item_code]),
                'after' => json_encode(['wbox_item_code' => $code]),
                'created_at' => now(),
            ]);
        });

        return response()->json(['product' => DB::table('products')->where('id', $product)->where('store_id', $storeId)->first()]);
    }
}
