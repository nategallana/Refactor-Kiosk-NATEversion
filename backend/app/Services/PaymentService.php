<?php

namespace App\Services;

interface PaymentService
{
    /**
     * Create a payment intent/record for the given order.
     *
     * @param object $order The order row from the database
     * @param string $method The payment method ('counter', 'card', 'qr_ph')
     * @return array{payment_id: int, status: string, action: string|null, action_data: mixed}
     *   - action: null (no further action), 'redirect' (redirect to URL), 'display_qr' (show QR code)
     *   - action_data: URL string, QR data, etc.
     */
    public function createPayment(object $order, string $method): array;

    /**
     * Check the current status of a payment.
     */
    public function getStatus(int $paymentId): string;
}
