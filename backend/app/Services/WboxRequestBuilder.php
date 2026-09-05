<?php

namespace App\Services;

use DOMDocument;
use Illuminate\Support\Collection;
use RuntimeException;

class WboxRequestBuilder
{
    public function build(object $order, Collection $items, object $settings, string $authToken): string
    {
        if ($items->isEmpty()) {
            throw new RuntimeException('The order has no items to export to WBOX.');
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $document->formatOutput = true;

        $root = $document->createElement('SendOrderRequest');
        $root->setAttribute('version', (string) $settings->wbox_version);
        $root->setAttribute('pdaver', (string) $settings->wbox_pdaver);
        $root->setAttribute('emp', '');
        $root->setAttribute('server', (string) $settings->wbox_server);
        $root->setAttribute('device', (string) $settings->wbox_device);
        $root->setAttribute('authtoken', $authToken);
        $root->setAttribute('product', (string) $settings->wbox_product);

        $ticketNumber = (string) $order->id;
        $orderElement = $document->createElement('Order');
        $orderElement->setAttribute('id', 'Tmp'.$ticketNumber);
        $orderElement->setAttribute('table', $order->dining_type === 'dine-in' ? $ticketNumber : 'TO GO1F');
        $orderElement->setAttribute('flag', 'New');
        $orderElement->setAttribute('saletype', '1');
        $orderElement->setAttribute('sendtokitchen', 'No');
        $orderElement->setAttribute('remark', $settings->wbox_kiosk_number.'#'.$ticketNumber);

        foreach ($items as $item) {
            if (! is_string($item->wbox_item_code) || trim($item->wbox_item_code) === '') {
                throw new RuntimeException(sprintf('Product %s does not have a WBOX item code.', $item->sku));
            }

            $itemElement = $document->createElement('OrderItem');
            $itemElement->setAttribute('id', $item->wbox_item_code);
            $itemElement->setAttribute('index', '0');
            $itemElement->setAttribute('qty', (string) $item->quantity);
            $itemElement->setAttribute('flag', 'New');
            $itemElement->setAttribute('price', $this->money((int) $item->line_total_minor));
            $itemElement->setAttribute('oprice', $this->money((int) $item->unit_price_minor));
            $itemElement->setAttribute('priceid', '0');
            $orderElement->appendChild($itemElement);
        }

        $root->appendChild($orderElement);
        $document->appendChild($root);

        $xml = $document->saveXML();
        if ($xml === false) {
            throw new RuntimeException('Unable to generate the WBOX request XML.');
        }

        return $xml;
    }

    private function money(int $minor): string
    {
        return number_format($minor / 100, 2, '.', '');
    }
}
