<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Handles incoming payment webhooks from external providers.
 * Currently a scaffold — signature verification and provider-specific
 * parsing will be added when a real gateway is integrated.
 */
class PaymentWebhookController extends Controller
{
    public function handle(Request $request, string $provider): JsonResponse
    {
        // TODO: Verify webhook signature per provider
        // e.g. PayMongo: hash_equals(hash_hmac('sha256', $request->getContent(), config('services.paymongo.webhook_secret')), $request->header('Paymongo-Signature'))

        $data = $request->validate([
            'payment_id' => ['required', 'integer'],
            'status' => ['required', 'string', 'in:succeeded,failed,cancelled,refunded'],
            'provider_reference' => ['nullable', 'string'],
        ]);

        $payment = DB::table('payments')->where('id', $data['payment_id'])->first();

        if ($payment === null) {
            return response()->json(['message' => 'Payment not found.'], 404);
        }

        if ($payment->provider !== $provider) {
            return response()->json(['message' => 'Provider mismatch.'], 400);
        }

        DB::transaction(function () use ($data, $payment): void {
            $updates = [
                'status' => $data['status'],
                'updated_at' => now(),
            ];

            if ($data['status'] === 'succeeded') {
                $updates['paid_at'] = now();
            }

            if (isset($data['provider_reference'])) {
                $updates['provider_reference'] = $data['provider_reference'];
            }

            DB::table('payments')->where('id', $payment->id)->update($updates);

            // Sync order payment status
            $orderPaymentStatus = match ($data['status']) {
                'succeeded' => 'paid',
                'failed', 'cancelled' => 'failed',
                'refunded' => 'refunded',
                default => 'pending',
            };

            DB::table('orders')->where('id', $payment->order_id)->update([
                'payment_status' => $orderPaymentStatus,
                'updated_at' => now(),
            ]);
        });

        return response()->json(['message' => 'Webhook processed.']);
    }
}
