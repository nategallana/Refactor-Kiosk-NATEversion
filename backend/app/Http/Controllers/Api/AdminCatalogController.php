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
        return response()->json([
            'categories' => DB::table('categories')->orderBy('display_order')->get(),
            'products' => DB::table('products')->join('categories', 'categories.id', '=', 'products.category_id')
                ->select('products.*', 'categories.name as category_name')->orderBy('products.name')->get(),
        ]);
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

    public function wboxMapping(Request $request, int $product): JsonResponse
    {
        $data = $request->validate([
            'menukey' => ['required', 'string', 'max:64'],
        ]);

        DB::table('products')->where('id', $product)->update([
            'wbox_menukey' => $data['menukey'],
            'updated_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    public function wboxSync(Request $request): JsonResponse
    {
        $settings = DB::table('system_settings')->where('id', 1)->first();
        $requestPath = $settings?->wbox_request_path ?: 'C:\\Restrnt\\3rdParty\\Request';
        $responsePath = $settings?->wbox_response_path ?: 'C:\\Restrnt\\3rdParty\\Response';

        // 1. Send inquiry packet to Request folder if path exists and writable
        $inquirySent = false;
        if (! empty($requestPath) && is_dir($requestPath) && is_writable($requestPath)) {
            $inquiryPacket = [
                'command' => 'GET_CATALOG',
                'action' => 'QUERY_MENU',
                'kiosk_number' => $settings?->wbox_kiosk_number ?: 'KIOSK-01',
                'version' => $settings?->wbox_version ?: '1.0',
                'timestamp' => now()->toIso8601String(),
            ];
            @file_put_contents(
                $requestPath . DIRECTORY_SEPARATOR . 'QUERY_MENU.json',
                json_encode($inquiryPacket, JSON_PRETTY_PRINT)
            );
            $inquirySent = true;
        }

        // 2. Look for response files in Response folder or direct input
        $items = [];
        $sourceFile = null;

        if ($request->has('items') && is_array($request->input('items'))) {
            $items = $request->input('items');
            $sourceFile = 'direct_payload';
        } elseif (! empty($responsePath) && is_dir($responsePath)) {
            $candidates = ['MENU_LIST.json', 'MENU.json', 'PRODUCTS.json', 'CATALOG.json', 'response.json', 'menu.json'];
            foreach ($candidates as $candidate) {
                $filePath = $responsePath . DIRECTORY_SEPARATOR . $candidate;
                if (file_exists($filePath) && is_readable($filePath)) {
                    $content = @file_get_contents($filePath);
                    $decoded = json_decode($content, true);
                    if (is_array($decoded)) {
                        $items = $decoded['products'] ?? $decoded['items'] ?? $decoded['menu'] ?? $decoded;
                        $sourceFile = $candidate;
                        break;
                    }
                }
            }

            // If still empty, check for any .json file in Response folder
            if (empty($items)) {
                $jsonFiles = glob($responsePath . DIRECTORY_SEPARATOR . '*.json');
                if (! empty($jsonFiles)) {
                    $filePath = $jsonFiles[0];
                    $content = @file_get_contents($filePath);
                    $decoded = json_decode($content, true);
                    if (is_array($decoded)) {
                        $items = $decoded['products'] ?? $decoded['items'] ?? $decoded['menu'] ?? $decoded;
                        $sourceFile = basename($filePath);
                    }
                }
            }
        }

        // 3. If response items were found, process upsert into products
        if (! empty($items) && is_array($items)) {
            $updated = 0;
            $created = 0;
            $defaultCat = DB::table('categories')->first();
            $defaultCatId = $defaultCat ? $defaultCat->id : 1;

            foreach ($items as $item) {
                if (! is_array($item)) continue;

                $menukey = trim(strval($item['menukey'] ?? $item['ItemCode'] ?? $item['plu'] ?? $item['code'] ?? $item['sku'] ?? ''));
                if (empty($menukey)) continue;

                $name = trim(strval($item['name'] ?? $item['ItemName'] ?? $item['description'] ?? $item['title'] ?? $menukey));
                $rawPrice = floatval($item['price'] ?? $item['UnitPrice'] ?? $item['amount'] ?? 0);
                $priceMinor = (int) round($rawPrice * 100);
                $available = (bool) ($item['active'] ?? $item['available'] ?? $item['status'] ?? true);
                $categoryName = trim(strval($item['category'] ?? $item['GroupName'] ?? ''));

                // Find matching category or use default
                $categoryId = $defaultCatId;
                if (! empty($categoryName)) {
                    $catRow = DB::table('categories')->where('name', 'like', $categoryName)->first();
                    if ($catRow) {
                        $categoryId = $catRow->id;
                    } else {
                        $categoryId = DB::table('categories')->insertGetId([
                            'name' => $categoryName,
                            'display_order' => 50,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                // Check existing product by wbox_menukey or sku
                $existing = DB::table('products')->where('wbox_menukey', $menukey)->orWhere('sku', $menukey)->first();

                if ($existing) {
                    $updates = [
                        'available' => $available,
                        'wbox_menukey' => $menukey,
                        'updated_at' => now(),
                    ];
                    if ($priceMinor > 0) {
                        $updates['price_minor'] = $priceMinor;
                    }
                    DB::table('products')->where('id', $existing->id)->update($updates);
                    $updated++;
                } else {
                    DB::table('products')->insert([
                        'category_id' => $categoryId,
                        'sku' => $menukey,
                        'name' => $name,
                        'description' => $item['description'] ?? 'Synced from WBOX POS',
                        'price_minor' => max($priceMinor, 100),
                        'wbox_menukey' => $menukey,
                        'available' => $available,
                        'active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $created++;
                }
            }

            DB::table('audit_logs')->insert([
                'actor_id' => $request->user()?->id,
                'action' => 'catalog.wbox_sync',
                'entity_type' => 'catalog',
                'entity_id' => 'all',
                'before' => null,
                'after' => json_encode(['updated' => $updated, 'created' => $created, 'source' => $sourceFile]),
                'created_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'pending' => false,
                'source_file' => $sourceFile,
                'updated' => $updated,
                'created' => $created,
                'total' => $updated + $created,
                'message' => "Successfully synced {$updated} updated and {$created} new products from WBOX ({$sourceFile}).",
            ]);
        }

        // 4. No response file found yet, but inquiry was dispatched
        return response()->json([
            'success' => true,
            'pending' => true,
            'inquiry_sent' => $inquirySent,
            'message' => $inquirySent
                ? 'Inquiry packet QUERY_MENU.json sent to Request folder. Awaiting WBOX POS response file in Response folder.'
                : 'Could not send inquiry. Please check WBOX Request folder path in Settings.',
        ]);
    }
}
