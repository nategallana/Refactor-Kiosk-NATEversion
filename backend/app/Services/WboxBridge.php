<?php

namespace App\Services;

use DOMDocument;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class WboxBridge
{
    public function __construct(private readonly WboxRequestBuilder $requestBuilder) {}

    /**
     * @return array{enabled: bool, response: string|null, export: string|null}
     */
    public function runOnce(): array
    {
        $settings = DB::table('system_settings')->where('id', 1)->first();
        if ($settings === null || ! (bool) $settings->wbox_enabled) {
            return ['enabled' => false, 'response' => null, 'export' => null];
        }

        $this->recoverInterruptedExports();
        $response = $this->processResponse($settings);
        $export = DB::table('wbox_exports')->where('status', 'sent')->exists()
            ? null
            : Cache::lock('wbox-bridge-export', 15)->get(fn () => $this->processNextExport($settings));

        return ['enabled' => true, 'response' => $response, 'export' => $export];
    }

    /**
     * @return array{request_path: array{path: string|null, exists: bool, writable: bool}, response_path: array{path: string|null, exists: bool, readable: bool}, credentials_configured: bool}
     */
    public function connectionStatus(): array
    {
        $settings = DB::table('system_settings')->where('id', 1)->first();
        $requestPath = $settings?->wbox_request_path;
        $responsePath = $settings?->wbox_response_path;

        return [
            'request_path' => [
                'path' => $requestPath,
                'exists' => is_string($requestPath) && is_dir($requestPath),
                'writable' => is_string($requestPath) && is_dir($requestPath) && is_writable($requestPath),
            ],
            'response_path' => [
                'path' => $responsePath,
                'exists' => is_string($responsePath) && is_dir($responsePath),
                'readable' => is_string($responsePath) && is_dir($responsePath) && is_readable($responsePath),
            ],
            'credentials_configured' => $settings !== null && filled($settings->wbox_auth_token_encrypted),
        ];
    }

    private function processNextExport(object $settings): ?string
    {
        $export = DB::table('wbox_exports')
            ->whereIn('status', ['pending', 'failed'])
            ->where(function ($query): void {
                $query->whereNull('available_at')->orWhere('available_at', '<=', now());
            })
            ->orderBy('id')
            ->first();

        if ($export === null) {
            return null;
        }

        DB::table('wbox_exports')->where('id', $export->id)->update([
            'status' => 'processing',
            'attempt_count' => DB::raw('attempt_count + 1'),
            'last_error' => null,
            'updated_at' => now(),
        ]);

        try {
            $requestDirectory = $this->requireDirectory($settings->wbox_request_path, true, 'request');
            $responseDirectory = $this->requireDirectory($settings->wbox_response_path, false, 'response');
            $authToken = $this->decryptToken($settings->wbox_auth_token_encrypted);
            $order = DB::table('orders')->where('id', $export->order_id)->first();
            if ($order === null) {
                throw new RuntimeException('The order no longer exists.');
            }
            $items = DB::table('order_items')->where('order_id', $order->id)->orderBy('id')->get();
            $terminal = DB::table('terminals')->where('id', $order->terminal_id)->first();
            if ($terminal === null) {
                throw new RuntimeException('The order terminal no longer exists.');
            }
            $terminalSettings = clone $settings;
            $terminalSettings->wbox_kiosk_number = $terminal->wbox_kiosk_number ?: $terminal->id;
            $xml = $this->requestBuilder->build($order, $items, $terminalSettings, $authToken);
            $filename = $this->filename($terminalSettings->wbox_kiosk_number, (int) $order->id);
            $requestPath = $requestDirectory.DIRECTORY_SEPARATOR.$filename;
            $signalPath = $requestDirectory.DIRECTORY_SEPARATOR.pathinfo($filename, PATHINFO_FILENAME).'.sig';
            $responsePath = $responseDirectory.DIRECTORY_SEPARATOR.$settings->wbox_response_filename;
            $baselineHash = is_file($responsePath) ? hash_file('sha256', $responsePath) : null;

            $this->writeRequest($requestPath, $xml);
            $this->writeSignal($signalPath);

            DB::table('wbox_exports')->where('id', $export->id)->update([
                'status' => 'sent',
                'request_filename' => $filename,
                'request_hash' => hash('sha256', $xml),
                'baseline_response_hash' => $baselineHash ?: null,
                'available_at' => null,
                'sent_at' => now(),
                'updated_at' => now(),
            ]);

            return 'sent';
        } catch (Throwable $exception) {
            DB::table('wbox_exports')->where('id', $export->id)->update([
                'status' => 'failed',
                'last_error' => Str::limit($exception->getMessage(), 2000, ''),
                'available_at' => now()->addSeconds((int) $settings->wbox_retry_seconds),
                'updated_at' => now(),
            ]);

            return 'failed';
        }
    }

    private function processResponse(object $settings): ?string
    {
        $export = DB::table('wbox_exports')->where('status', 'sent')->orderBy('sent_at')->first();
        if ($export === null) {
            return null;
        }

        try {
            $responseDirectory = $this->requireDirectory($settings->wbox_response_path, false, 'response');
            $responsePath = $responseDirectory.DIRECTORY_SEPARATOR.$settings->wbox_response_filename;
            if (! is_file($responsePath)) {
                return null;
            }

            $hash = hash_file('sha256', $responsePath);
            if ($hash === false || hash_equals((string) $export->baseline_response_hash, $hash)) {
                return null;
            }
            if (DB::table('wbox_exports')->where('response_hash', $hash)->exists()) {
                return null;
            }

            [$success, $message] = $this->parseResponse($responsePath);
            DB::table('wbox_exports')->where('id', $export->id)->update([
                'status' => $success ? 'acknowledged' : 'rejected',
                'response_hash' => $hash,
                'response_success' => $success,
                'response_message' => $message,
                'last_error' => $success ? null : $message,
                'acknowledged_at' => now(),
                'updated_at' => now(),
            ]);

            return $success ? 'acknowledged' : 'rejected';
        } catch (Throwable $exception) {
            DB::table('wbox_exports')->where('id', $export->id)->update([
                'last_error' => Str::limit('Response error: '.$exception->getMessage(), 2000, ''),
                'updated_at' => now(),
            ]);

            return 'response-error';
        }
    }

    /** @return array{0: bool, 1: string} */
    private function parseResponse(string $path): array
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $document->load($path, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (! $loaded) {
            throw new RuntimeException('WBOX returned invalid XML.');
        }

        $result = $document->getElementsByTagName('SendOrderResult')->item(0);
        if ($result === null) {
            throw new RuntimeException('WBOX response is missing SendOrderResult.');
        }

        $success = in_array(strtolower($result->getAttribute('success')), ['1', 'true', 'yes'], true);
        $message = trim($result->getAttribute('message')) ?: ($success ? 'WBOX accepted the order.' : 'WBOX rejected the order.');

        return [$success, $message];
    }

    private function recoverInterruptedExports(): void
    {
        DB::table('wbox_exports')
            ->where('status', 'processing')
            ->where('updated_at', '<=', now()->subMinutes(5))
            ->update([
                'status' => 'failed',
                'last_error' => 'The previous WBOX bridge process stopped before delivery completed.',
                'available_at' => now(),
                'updated_at' => now(),
            ]);
    }

    private function requireDirectory(?string $path, bool $write, string $label): string
    {
        if (! is_string($path) || trim($path) === '' || ! is_dir($path)) {
            throw new RuntimeException(sprintf('The WBOX %s folder does not exist: %s', $label, $path ?: '(not configured)'));
        }
        if ($write && ! is_writable($path)) {
            throw new RuntimeException(sprintf('The WBOX %s folder is not writable: %s', $label, $path));
        }
        if (! $write && ! is_readable($path)) {
            throw new RuntimeException(sprintf('The WBOX %s folder is not readable: %s', $label, $path));
        }

        return rtrim($path, '\\/');
    }

    private function decryptToken(?string $encrypted): string
    {
        if (! filled($encrypted)) {
            throw new RuntimeException('The WBOX authentication token is not configured.');
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (DecryptException) {
            throw new RuntimeException('The WBOX authentication token cannot be decrypted with this application key.');
        }
    }

    private function filename(string $kioskNumber, int $ticketNumber): string
    {
        $safeKioskNumber = preg_replace('/[^A-Za-z0-9_-]/', '', $kioskNumber);
        if ($safeKioskNumber === '') {
            throw new RuntimeException('The WBOX kiosk number is invalid.');
        }

        return $safeKioskNumber.'Ticket#'.$ticketNumber.'.request';
    }

    private function writeRequest(string $path, string $xml): void
    {
        if (is_file($path)) {
            $existingHash = hash_file('sha256', $path);
            if ($existingHash !== false && hash_equals($existingHash, hash('sha256', $xml))) {
                return;
            }
            throw new RuntimeException('A different WBOX request already exists for this ticket: '.basename($path));
        }

        $temporaryPath = $path.'.tmp-'.Str::random(8);
        try {
            if (file_put_contents($temporaryPath, $xml, LOCK_EX) === false || ! rename($temporaryPath, $path)) {
                throw new RuntimeException('Unable to atomically write the WBOX request file.');
            }
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }
    }

    private function writeSignal(string $path): void
    {
        if (is_file($path)) {
            return;
        }

        $temporaryPath = $path.'.tmp-'.Str::random(8);
        try {
            if (file_put_contents($temporaryPath, '') === false || ! rename($temporaryPath, $path)) {
                throw new RuntimeException('Unable to atomically write the WBOX signal file.');
            }
        } finally {
            if (is_file($temporaryPath)) {
                @unlink($temporaryPath);
            }
        }
    }
}
