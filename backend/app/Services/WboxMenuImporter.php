<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use RuntimeException;

class WboxMenuImporter
{
    /**
     * Parse Menu.txt CSV file and upsert into categories & products.
     *
     * @param string|null $menuPath
     * @param string|null $categoryDbPath
     * @param int $storeId
     * @return array{success: bool, imported_products: int, updated_products: int, categories_created: int, categories_existing: int, file_path: string}
     */
    public function import(?string $menuPath = null, ?string $categoryDbPath = null, int $storeId = 1): array
    {
        $resolvedMenuPath = $this->resolveMenuPath($menuPath);
        if (! $resolvedMenuPath || ! is_readable($resolvedMenuPath)) {
            throw new RuntimeException("Menu.txt file not found or not readable at: " . ($menuPath ?? 'default locations'));
        }

        $categoryNames = $this->loadCategoryNames($categoryDbPath);

        $lines = file($resolvedMenuPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines === false) {
            throw new RuntimeException("Failed to read Menu.txt from: {$resolvedMenuPath}");
        }

        $categoriesCreated = 0;
        $categoriesExisting = 0;
        $importedProducts = 0;
        $updatedProducts = 0;

        // Cache existing categories for store: code/name => id
        $categoryCache = [];
        $existingCats = DB::table('categories')->where('store_id', $storeId)->get();
        foreach ($existingCats as $cat) {
            $categoryCache[$cat->name] = $cat->id;
        }

        // Cache existing products for store: menukey => id, sku => id
        $productCache = [];
        $existingProds = DB::table('products')->where('store_id', $storeId)->get();
        foreach ($existingProds as $prod) {
            if ($prod->wbox_menukey) {
                $productCache['menukey:' . $prod->wbox_menukey] = $prod;
            }
            if ($prod->wbox_item_code) {
                $productCache['code:' . $prod->wbox_item_code] = $prod;
            }
            if ($prod->sku) {
                $productCache['sku:' . $prod->sku] = $prod;
            }
        }

        DB::beginTransaction();
        try {
            $catDisplayOrder = 10;

            foreach ($lines as $lineIndex => $line) {
                $cols = str_getcsv($line);
                if (count($cols) < 6) {
                    continue;
                }

                $menuKey = trim($cols[0] ?? '');
                $itemCode = trim($cols[1] ?? '');
                $catCode = trim($cols[2] ?? '');
                $name = trim($cols[5] ?? '');
                $activeFlag = strtoupper(trim($cols[14] ?? 'Y'));
                $availFlag = trim($cols[15] ?? '1');
                $priceRaw = floatval(trim($cols[35] ?? '0'));

                // Skip entries without menukey or name
                if (empty($menuKey) || empty($name)) {
                    continue;
                }

                $priceMinor = (int) round($priceRaw * 100);

                // Category resolution
                $cleanCatCode = trim($catCode, "\"'\t\n\r ");
                $catName = $categoryNames[$cleanCatCode] ?? ($cleanCatCode !== '' ? "CAT-{$cleanCatCode}" : 'General');
                
                // Clean category name of noise
                $catName = trim(preg_replace('/[\x00-\x1F\x7F]/', '', $catName));
                if (empty($catName)) {
                    $catName = 'General';
                }

                if (! isset($categoryCache[$catName])) {
                    $catId = DB::table('categories')->insertGetId([
                        'store_id' => $storeId,
                        'name' => $catName,
                        'display_order' => $catDisplayOrder++,
                        'active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $categoryCache[$catName] = $catId;
                    $categoriesCreated++;
                } else {
                    $catId = $categoryCache[$catName];
                    $categoriesExisting++;
                }

                // Match existing product
                $sku = ! empty($itemCode) ? $itemCode : ('WB-' . $menuKey);
                $existing = $productCache['menukey:' . $menuKey] 
                    ?? $productCache['code:' . $itemCode] 
                    ?? $productCache['sku:' . $sku] 
                    ?? null;

                $isActive = ($activeFlag === 'Y');
                $isAvailable = ($availFlag === '1');

                if ($existing) {
                    DB::table('products')->where('id', $existing->id)->update([
                        'category_id' => $catId,
                        'name' => $name,
                        'price_minor' => $priceMinor > 0 ? $priceMinor : $existing->price_minor,
                        'active' => $isActive,
                        'available' => $isAvailable,
                        'wbox_menukey' => $menuKey,
                        'wbox_item_code' => ! empty($itemCode) ? $itemCode : $menuKey,
                        'updated_at' => now(),
                    ]);
                    $updatedProducts++;
                } else {
                    $newId = DB::table('products')->insertGetId([
                        'store_id' => $storeId,
                        'category_id' => $catId,
                        'sku' => $sku,
                        'name' => $name,
                        'description' => "Imported from WBOX POS ({$sku})",
                        'price_minor' => max($priceMinor, 0),
                        'emoji' => $this->getCategoryEmoji($catName),
                        'accent' => '#fff4ed',
                        'active' => $isActive,
                        'available' => $isAvailable,
                        'combo' => false,
                        'image_url' => null,
                        'wbox_menukey' => $menuKey,
                        'wbox_item_code' => ! empty($itemCode) ? $itemCode : $menuKey,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    $cachedObj = (object) ['id' => $newId, 'sku' => $sku, 'wbox_menukey' => $menuKey, 'wbox_item_code' => $itemCode, 'price_minor' => $priceMinor];
                    $productCache['menukey:' . $menuKey] = $cachedObj;
                    $productCache['code:' . $itemCode] = $cachedObj;
                    $productCache['sku:' . $sku] = $cachedObj;

                    $importedProducts++;
                }
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return [
            'success' => true,
            'imported_products' => $importedProducts,
            'updated_products' => $updatedProducts,
            'categories_created' => $categoriesCreated,
            'categories_existing' => count($categoryCache),
            'file_path' => $resolvedMenuPath,
        ];
    }

    /**
     * Resolve path to Menu.txt searching standard kiosk locations.
     */
    public function resolveMenuPath(?string $path = null): ?string
    {
        if ($path && is_file($path) && is_readable($path)) {
            return $path;
        }

        $candidates = [
            'C:\\Users\\MIS-01\\Desktop\\Menu.txt',
            base_path('../Menu.txt'),
            base_path('Menu.txt'),
            'C:\\Restrnt\\Data\\Menu.txt',
            'C:\\Restrnt\\3rdParty\\Request\\Menu.txt',
            'C:\\Restrnt\\3rdParty\\Response\\Menu.txt',
            'C:\\WBOX\\Menu.txt',
        ];

        foreach ($candidates as $cand) {
            if (is_file($cand) && is_readable($cand)) {
                return $cand;
            }
        }

        return null;
    }

    /**
     * Load category code to name map from JSON or Paradox Category.DB.
     */
    public function loadCategoryNames(?string $categoryDbPath = null): array
    {
        // 1. Try pre-parsed JSON dictionary
        $jsonCandidates = [
            base_path('../scripts/parsed-categories.json'),
            base_path('scripts/parsed-categories.json'),
            base_path('parsed-categories.json'),
        ];

        foreach ($jsonCandidates as $jsonPath) {
            if (is_file($jsonPath) && is_readable($jsonPath)) {
                $decoded = json_decode(file_get_contents($jsonPath), true);
                if (is_array($decoded) && ! empty($decoded)) {
                    return $decoded;
                }
            }
        }

        // 2. Direct parse from Category.DB if present
        $dbPath = $categoryDbPath ?: 'C:\\Restrnt\\Data\\Category.DB';
        if (is_file($dbPath) && is_readable($dbPath)) {
            $parsed = $this->parseCategoryDb($dbPath);
            if (! empty($parsed)) {
                return $parsed;
            }
        }

        return [];
    }

    /**
     * Binary parse Paradox Category.DB records.
     */
    public function parseCategoryDb(string $path): array
    {
        $content = @file_get_contents($path);
        if ($content === false) {
            return [];
        }

        $categories = [];
        // Pattern: 10-digit code followed by 1 to 6 non-ascii/flag bytes, then printable name
        if (preg_match_all('/(000000\d{4})[^\x20-\x7E]{1,6}(.{3,30}?)(?:\s*X)?[\x00-\x1F]/', $content, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $m) {
                $code = $m[1];
                $raw = $m[2];
                $name = trim(preg_replace('/\s+X$/', '', $raw));
                $name = trim(preg_replace('/^[^A-Za-z0-9]+/', '', $name));
                $name = trim(preg_replace('/[\x00-\x1F\x7F].*$/', '', $name));
                if (strlen($name) >= 2 && ! isset($categories[$code])) {
                    $categories[$code] = $name;
                }
            }
        }

        $categories['OTHERS'] = 'OTHERS';
        $categories['OTHERS X'] = 'OTHERS';

        return $categories;
    }

    private function getCategoryEmoji(string $name): string
    {
        $lower = strtolower($name);
        if (str_contains($lower, 'burger')) return '🍔';
        if (str_contains($lower, 'wing') || str_contains($lower, 'drumstick') || str_contains($lower, 'boneless')) return '🍗';
        if (str_contains($lower, 'drink') || str_contains($lower, 'booze') || str_contains($lower, 'dew') || str_contains($lower, 'coffee') || str_contains($lower, 'bucket')) return '🍹';
        if (str_contains($lower, 'fries') || str_contains($lower, 'side') || str_contains($lower, 'dip') || str_contains($lower, 'sauce') || str_contains($lower, 'extra') || str_contains($lower, 'onion')) return '🍟';
        if (str_contains($lower, 'dessert') || str_contains($lower, 'cream') || str_contains($lower, 'brownie') || str_contains($lower, 'cake')) return '🍦';
        if (str_contains($lower, 'main') || str_contains($lower, 'rice') || str_contains($lower, 'spag') || str_contains($lower, 'pasta') || str_contains($lower, 'fettucine')) return '🍝';
        return '🍽️';
    }
}