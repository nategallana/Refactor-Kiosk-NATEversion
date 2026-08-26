<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Stub provider for card payments.
 * In production, this would integrate with a real payment gateway
 * (PayMongo, Maya, Stripe Terminal, etc.)
 * 
 * Currently behaves like counter payment (pending until staff confirms).
 */
class CardPaymentProvider implements PaymentService
{
    public function createPayment(object $order, string $method): array
    {
        $id = DB::table('payments')->insertGetId([
            'order_id' => $order->id,
            'provider' => 'card_stub',
            'provider_reference' => null,
            'amount_minor' => $order->total_minor,
            'currency' => 'PHP',
            'status' => 'pending',
            'payment_channel' => 'card_present',
            'metadata_json' => json_encode(['note' => 'Stub provider — replace with real gateway integration']),
            'paid_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'payment_id' => $id,
            'status' => 'pending',
            'action' => null,  // Real provider would return 'display_qr' or terminal prompt
            'action_data' => null,
        ];
    }

    public function getStatus(int $paymentId): string
    {
        $payment = DB::table('payments')->where('id', $paymentId)->first();
        return $payment?->status ?? 'unknown';
    }
}
