<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CounterPaymentProvider implements PaymentService
{
    public function createPayment(object $order, string $method): array
    {
        $id = DB::table('payments')->insertGetId([
            'order_id' => $order->id,
            'provider' => 'counter',
            'provider_reference' => null,
            'amount_minor' => $order->total_minor,
            'currency' => 'PHP',
            'status' => 'pending',  // Staff confirms at counter
            'payment_channel' => 'counter',
            'metadata_json' => null,
            'paid_at' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'payment_id' => $id,
            'status' => 'pending',
            'action' => null,
            'action_data' => null,
        ];
    }

    public function getStatus(int $paymentId): string
    {
        $payment = DB::table('payments')->where('id', $paymentId)->first();
        return $payment?->status ?? 'unknown';
    }
}
