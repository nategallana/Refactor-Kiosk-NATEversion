<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge(['idempotency_key' => $request->header('Idempotency-Key')]);
        $data = $request->validate([
            'idempotency_key' => ['required', 'uuid'],
            'terminal_id' => ['nullable', 'string', 'max:64'],
            'dining_type' => ['required', Rule::in(['dine-in', 'takeout'])],
            'payment_method' => ['required', Rule::in(['counter', 'card'])],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.sku' => ['required', 'string', 'max:64'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
            'items.*.note' => ['nullable', 'string', 'max:80'],
            'items.*.selections' => ['present', 'array'],
            'items.*.selections.*.groupId' => ['required', 'string', 'max:64'],
            'items.*.selections.*.valueId' => ['required', 'string', 'max:64'],
        ]);

        $idempotencyKey = $data['idempotency_key'];
        unset($data['idempotency_key']);
        $requestFingerprint = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));

        try {
            [$order, $canonicalItems, $replayed, $paymentResult] = DB::transaction(function () use ($data, $idempotencyKey, $requestFingerprint): array {
                $existing = DB::table('orders')->where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();
                if ($existing !== null) {
                    [$existing, $existingItems, $existingPaymentResult] = $this->replayExistingOrder($existing, $requestFingerprint);

                    return [$existing, $existingItems, true, $existingPaymentResult];
                }

                $settings = DB::table('system_settings')->where('id', 1)->lockForUpdate()->first();
                abort_if($settings === null, 503, 'System settings are unavailable.');

                $paymentEnabled = $data['payment_method'] === 'card'
                    ? (bool) $settings->card_payment_enabled
                    : (bool) $settings->counter_payment_enabled;
                if (! $paymentEnabled) {
                    throw ValidationException::withMessages([
                        'payment_method' => ['The selected payment method is unavailable.'],
                    ]);
                }

                $skus = collect($data['items'])->pluck('sku')->unique()->values();
                $products = DB::table('products')->whereIn('sku', $skus)->lockForUpdate()->get()->keyBy('sku');
                [$canonicalItems, $subtotalMinor] = $this->priceItems($data['items'], $products);

                $taxRateBasisPoints = (int) $settings->tax_rate_basis_points;
                $taxMinor = intdiv(($subtotalMinor * $taxRateBasisPoints) + 5000, 10000);
                $totalMinor = $subtotalMinor + $taxMinor;
                $now = now();

                $orderId = DB::table('orders')->insertGetId([
                    'order_number' => 'pending-'.Str::uuid(),
                    'idempotency_key' => $idempotencyKey,
                    'request_fingerprint' => $requestFingerprint,
                    'terminal_id' => $data['terminal_id'] ?? 'KIOSK-01',
                    'dining_type' => $data['dining_type'],
                    'subtotal_minor' => $subtotalMinor,
                    'tax_minor' => $taxMinor,
                    'total_minor' => $totalMinor,
                    'payment_method' => $data['payment_method'],
                    'items_json' => json_encode($canonicalItems, JSON_THROW_ON_ERROR),
                    'payment_status' => 'pending',
                    'fulfillment_status' => 'pending',
                    'placed_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $orderNumber = 'K'.$now->format('ymd').'-'.str_pad((string) $orderId, 6, '0', STR_PAD_LEFT);
                DB::table('orders')->where('id', $orderId)->update(['order_number' => $orderNumber]);

                DB::table('order_items')->insert(array_map(fn (array $item): array => [
                    'order_id' => $orderId,
                    'product_id' => $item['productId'],
                    'sku' => $item['sku'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'unit_price_minor' => $item['unitPrice'],
                    'line_total_minor' => $item['lineTotal'],
                    'selections_json' => json_encode($item['selections'], JSON_THROW_ON_ERROR),
                    'note' => $item['note'] ?: null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $canonicalItems));

                // Create payment record
                $paymentService = $data['payment_method'] === 'counter'
                    ? new \App\Services\CounterPaymentProvider()
                    : new \App\Services\CardPaymentProvider();
                $paymentResult = $paymentService->createPayment(
                    DB::table('orders')->where('id', $orderId)->first(),
                    $data['payment_method']
                );

                return [DB::table('orders')->where('id', $orderId)->first(), $canonicalItems, false, $paymentResult];
            });
        } catch (UniqueConstraintViolationException $exception) {
            $existing = DB::table('orders')->where('idempotency_key', $idempotencyKey)->first();
            if ($existing === null) {
                throw $exception;
            }

            [$order, $canonicalItems, $paymentResult] = $this->replayExistingOrder($existing, $requestFingerprint);
            $replayed = true;
        }

        $order->items = $canonicalItems;

        return response()
            ->json(['order' => $order, 'payment' => $paymentResult], $replayed ? 200 : 201)
            ->header('Idempotency-Replayed', $replayed ? 'true' : 'false');
    }

    /**
     * @return array{0: object, 1: array<int, array<string, mixed>>, 2: array|null}
     */
    private function replayExistingOrder(object $order, string $requestFingerprint): array
    {
        if (! hash_equals((string) $order->request_fingerprint, $requestFingerprint)) {
            throw new HttpResponseException(response()->json([
                'message' => 'The idempotency key has already been used for a different order.',
            ], 409));
        }

        $items = json_decode($order->items_json ?? '[]', true, 512, JSON_THROW_ON_ERROR);

        $existingPayment = DB::table('payments')->where('order_id', $order->id)->first();
        $paymentResult = $existingPayment ? [
            'payment_id' => $existingPayment->id,
            'status' => $existingPayment->status,
            'action' => null, // Just returning basic info on replay
            'action_data' => null,
        ] : null;

        return [$order, $items, $paymentResult];
    }

    /**
     * @param  array<int, array<string, mixed>>  $requestedItems
     * @param  Collection<string, object>  $products
     * @return array{0: array<int, array<string, mixed>>, 1: int}
     */
    private function priceItems(array $requestedItems, Collection $products): array
    {
        $errors = [];
        $canonicalItems = [];
        $subtotalMinor = 0;

        foreach ($requestedItems as $itemIndex => $requestedItem) {
            $product = $products->get($requestedItem['sku']);
            if ($product === null) {
                $errors['items.'.$itemIndex.'.sku'][] = 'The selected product does not exist.';

                continue;
            }
            if (! (bool) $product->active || ! (bool) $product->available) {
                $errors['items.'.$itemIndex.'.sku'][] = 'The selected product is unavailable.';

                continue;
            }

            $optionGroups = json_decode($product->option_groups_json ?? '[]', true, 512, JSON_THROW_ON_ERROR);
            $groupsById = collect($optionGroups)->keyBy('id');
            $selectedByGroup = [];
            $canonicalSelections = [];
            $unitPriceMinor = (int) $product->price_minor;

            foreach ($requestedItem['selections'] as $selectionIndex => $selection) {
                $group = $groupsById->get($selection['groupId']);
                if ($group === null) {
                    $errors['items.'.$itemIndex.'.selections.'.$selectionIndex.'.groupId'][] = 'The selected option group is invalid for this product.';

                    continue;
                }

                $value = collect($group['values'])->firstWhere('id', $selection['valueId']);
                if ($value === null) {
                    $errors['items.'.$itemIndex.'.selections.'.$selectionIndex.'.valueId'][] = 'The selected option is invalid for this product.';

                    continue;
                }
                if (isset($selectedByGroup[$group['id']][$value['id']])) {
                    $errors['items.'.$itemIndex.'.selections.'.$selectionIndex.'.valueId'][] = 'The same option cannot be selected more than once.';

                    continue;
                }

                $selectedByGroup[$group['id']][$value['id']] = true;
                $priceDeltaMinor = (int) $value['priceDelta'];
                $unitPriceMinor += $priceDeltaMinor;
                $canonicalSelections[] = [
                    'groupId' => $group['id'],
                    'groupName' => $group['name'],
                    'valueId' => $value['id'],
                    'valueName' => $value['name'],
                    'priceDelta' => $priceDeltaMinor,
                ];
            }

            foreach ($optionGroups as $group) {
                $selectionCount = count($selectedByGroup[$group['id']] ?? []);
                if ($selectionCount < (int) $group['minSelections'] || $selectionCount > (int) $group['maxSelections']) {
                    $errors['items.'.$itemIndex.'.selections'][] = sprintf(
                        '%s requires between %d and %d selections.',
                        $group['name'],
                        $group['minSelections'],
                        $group['maxSelections'],
                    );
                }
            }

            $quantity = (int) $requestedItem['quantity'];
            $lineTotalMinor = $unitPriceMinor * $quantity;
            $subtotalMinor += $lineTotalMinor;
            $canonicalItems[] = [
                'productId' => (int) $product->id,
                'sku' => $product->sku,
                'name' => $product->name,
                'quantity' => $quantity,
                'unitPrice' => $unitPriceMinor,
                'lineTotal' => $lineTotalMinor,
                'selections' => $canonicalSelections,
                'note' => $requestedItem['note'] ?? '',
            ];
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return [$canonicalItems, $subtotalMinor];
    }
}
