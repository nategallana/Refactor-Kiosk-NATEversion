<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WboxMenuImporter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCatalogController extends Controller
{
    public function __construct(private readonly ?WboxMenuImporter $menuImporter = null) {}

    public function importFromMenuTxt(Request $request): JsonResponse
    {
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id') ?? 1);
        $path = $request->input('path');

        $importer = $this->menuImporter ?? app(WboxMenuImporter::class);

        try {
            $result = $importer->import($path, null, $storeId);
            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$result['imported_products']} new products and updated {$result['updated_products']} products ({$result['categories_existing']} categories total) from {$result['file_path']}.",
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to import Menu.txt: ' . $e->getMessage(),
            ], 422);
        }
    }

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
        $terminal = $request->attributes->get('_terminal');
        $storeId = (int) ($terminal?->store_id ?? $request->attributes->get('store_id') ?? 1);
        $settings = DB::table('system_settings')->where('id', 1)->first();
        $requestPath = $settings?->wbox_request_path ?: 'C:\\Restrnt\\3rdParty\\Request';
        $responsePath = $settings?->wbox_response_path ?: 'C:\\Restrnt\\3rdParty\\Response';

        $kioskNum = $settings?->wbox_kiosk_number ?: 'KIOSK-01';
        $inquirySent = false;

        // 1. Send XML & JSON inquiry to Request folder if path exists and writable
        if (! empty($requestPath) && is_dir($requestPath) && is_writable($requestPath)) {
            $xmlContent = "<?xml version=\"1.0\" encoding=\"utf-8\"?>\n<Request action=\"RetrieveOrder\" type=\"Menu\">\n  <KioskId>{$kioskNum}</KioskId>\n  <Time>" . now()->toIso8601String() . "</Time>\n</Request>";
            @file_put_contents($requestPath . DIRECTORY_SEPARATOR . 'RetrieveOrderRequest.xml', $xmlContent);

            $inquiryPacket = [
                'command' => 'GET_CATALOG',
                'action' => 'QUERY_MENU',
                'kiosk_number' => $kioskNum,
                'version' => $settings?->wbox_version ?: '1.0',
                'timestamp' => now()->toIso8601String(),
            ];
            @file_put_contents($requestPath . DIRECTORY_SEPARATOR . 'QUERY_MENU.json', json_encode($inquiryPacket, JSON_PRETTY_PRINT));
            $inquirySent = true;
        }

        // 2. Search Response folder or direct payload
        $items = [];
        $sourceFile = null;

        if ($request->has('items') && is_array($request->input('items'))) {
            $items = $request->input('items');
            $sourceFile = 'direct_payload';
        } elseif (! empty($responsePath) && is_dir($responsePath)) {
            // Check XML files in Response
            $xmlFiles = glob($responsePath . DIRECTORY_SEPARATOR . '*.xml');
            if (! empty($xmlFiles)) {
                foreach ($xmlFiles as $xmlFile) {
                    $xmlDoc = @simplexml_load_file($xmlFile);
                    if ($xmlDoc) {
                        $parsed = $this->extractItemsFromXml($xmlDoc);
                        if (! empty($parsed)) {
                            $items = $parsed;
                            $sourceFile = basename($xmlFile);
                            break;
                        }
                    }
                }
            }

            // Check JSON files in Response
            if (empty($items)) {
                $candidates = ['MENU_LIST.json', 'MENU.json', 'PRODUCTS.json', 'CATALOG.json', 'response.json', 'menu.json'];
                foreach ($candidates as $candidate) {
                    $filePath = $responsePath . DIRECTORY_SEPARATOR . $candidate;
                    if (file_exists($filePath) && is_readable($filePath)) {
                        $decoded = json_decode(@file_get_contents($filePath), true);
                        if (is_array($decoded)) {
                            $items = $decoded['products'] ?? $decoded['items'] ?? $decoded['menu'] ?? $decoded;
                            $sourceFile = $candidate;
                            break;
                        }
                    }
                }
            }
        }

        // 3. Fallback: Auto-ingest from Menu.txt if present
        $importer = $this->menuImporter ?? app(WboxMenuImporter::class);
        $resolvedMenu = $importer->resolveMenuPath($request->input('menu_path'));
        if (empty($items) && $resolvedMenu) {
            try {
                $menuResult = $importer->import($resolvedMenu, null, $storeId);
                return response()->json([
                    'success' => true,
                    'inquiry_sent' => $inquirySent,
                    'source_file' => basename($menuResult['file_path']),
                    'synced_count' => $menuResult['imported_products'] + $menuResult['updated_products'],
                    'updated' => $menuResult['updated_products'],
                    'created' => $menuResult['imported_products'],
                    'message' => "Successfully imported from {$menuResult['file_path']} ({$menuResult['imported_products']} created, {$menuResult['updated_products']} updated).",
                ]);
            } catch (\Throwable) {
                // If Menu.txt import fails, continue to next fallback
            }
        }

        // 4. Fallback: Auto-ingest from local WBOX POS XML dumps (C:\wBoxCloud\CloudAgent\BACKUP\)
        if (empty($items)) {
            $cloudBackupPattern = 'C:\\wBoxCloud\\CloudAgent\\BACKUP\\*\\*.xml';
            $backupFiles = glob($cloudBackupPattern);
            if (! empty($backupFiles)) {
                usort($backupFiles, fn($a, $b) => filemtime($b) <=> filemtime($a));
                foreach (array_slice($backupFiles, 0, 15) as $backupFile) {
                    $xmlDoc = @simplexml_load_file($backupFile);
                    if ($xmlDoc) {
                        $parsed = $this->extractItemsFromXml($xmlDoc);
                        if (! empty($parsed)) {
                            foreach ($parsed as $p) {
                                $key = $p['menukey'] ?? $p['sku'];
                                if (! isset($items[$key])) {
                                    $items[$key] = $p;
                                }
                            }
                            $sourceFile = 'WBOX POS Cloud Backup (' . basename($backupFile) . ')';
                        }
                    }
                }
                $items = array_values($items);
            }
        }

        // 5. Process upsert into products
        if (! empty($items) && is_array($items)) {
            $updated = 0;
            $created = 0;
            $defaultCat = DB::table('categories')->where('store_id', $storeId)->first();
            if (! $defaultCat) {
                $defaultCatId = DB::table('categories')->insertGetId([
                    'store_id' => $storeId,
                    'name' => 'General Menu',
                    'display_order' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $defaultCatId = $defaultCat->id;
            }

            foreach ($items as $item) {
                if (! is_array($item)) continue;
                $menukey = trim(strval($item['menukey'] ?? $item['ItemCode'] ?? $item['plu'] ?? $item['code'] ?? $item['sku'] ?? ''));
                $name = trim(strval($item['name'] ?? $item['MenuName'] ?? $item['Description'] ?? ''));
                if (empty($menukey) || empty($name)) continue;

                $price = floatval($item['price'] ?? $item['Price'] ?? $item['PriceBefDisc'] ?? 0);
                $priceMinor = intval(round($price * 100));
                if ($priceMinor <= 0 && isset($item['price_minor'])) {
                    $priceMinor = intval($item['price_minor']);
                }

                $catName = trim(strval($item['category'] ?? $item['Category'] ?? ''));
                $categoryId = $defaultCatId;
                if (! empty($catName)) {
                    $existingCat = DB::table('categories')->where('store_id', $storeId)->where('name', $catName)->first();
                    if ($existingCat) {
                        $categoryId = $existingCat->id;
                    } else {
                        $categoryId = DB::table('categories')->insertGetId([
                            'store_id' => $storeId,
                            'name' => $catName,
                            'display_order' => 10,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $existing = DB::table('products')->where('store_id', $storeId)->where(function($q) use ($menukey) {
                    $q->where('wbox_item_code', $menukey)->orWhere('sku', $menukey);
                })->first();

                if ($existing) {
                    DB::table('products')->where('id', $existing->id)->update([
                        'name' => $name,
                        'price_minor' => $priceMinor > 0 ? $priceMinor : $existing->price_minor,
                        'category_id' => $categoryId,
                        'wbox_item_code' => $menukey,
                        'available' => true,
                        'updated_at' => now(),
                    ]);
                    $updated++;
                } else {
                    DB::table('products')->insert([
                        'store_id' => $storeId,
                        'category_id' => $categoryId,
                        'sku' => $menukey,
                        'name' => $name,
                        'description' => $item['description'] ?? 'Synced from WBOX POS',
                        'price_minor' => max($priceMinor, 100),
                        'wbox_item_code' => $menukey,
                        'available' => true,
                        'active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $created++;
                }
            }

            return response()->json([
                'success' => true,
                'inquiry_sent' => $inquirySent,
                'source_file' => $sourceFile,
                'synced_count' => $updated + $created,
                'updated' => $updated,
                'created' => $created,
                'message' => "Successfully synced {$updated} updated and {$created} new products from WBOX ({$sourceFile}).",
            ]);
        }

        return response()->json([
            'success' => $inquirySent,
            'inquiry_sent' => $inquirySent,
            'source_file' => null,
            'synced_count' => 0,
            'message' => $inquirySent
                ? 'Inquiry packets RetrieveOrderRequest.xml & QUERY_MENU.json sent to Request folder. Awaiting WBOX POS response in Response folder.'
                : 'Could not send inquiry. Please check WBOX Request folder path in Settings.',
        ]);
    }

    private function extractItemsFromXml(\SimpleXMLElement $xml): array
    {
        $results = [];
        $items = $xml->xpath('//Item') ?: [];
        foreach ($items as $item) {
            $attrs = $item->attributes();
            $menuKey = (string) ($attrs['MenuKey'] ?? $attrs['menukey'] ?? $attrs['MenuNo'] ?? '');
            $menuName = (string) ($attrs['MenuName'] ?? $attrs['Name'] ?? $attrs['Description'] ?? '');
            $price = (float) ($attrs['Price'] ?? $attrs['PriceBefDisc'] ?? 0);
            $category = (string) ($attrs['Category'] ?? '');
            if (! empty($menuKey) && ! empty($menuName)) {
                $results[] = [
                    'menukey' => $menuKey,
                    'name' => $menuName,
                    'price' => $price,
                    'category' => $category,
                ];
            }
        }
        return $results;
    }
}
