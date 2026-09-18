<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SecurityAuditService;
use App\Services\WboxRequestBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class AdminWboxAgentController extends Controller
{
    public function __construct(
        private readonly WboxRequestBuilder $requestBuilder
    ) {}

    /**
     * Authenticate agent request using wbox_agent_token.
     * @return object system_settings record for the authenticated store
     */
    private function authenticateAgent(Request $request): object
    {
        $token = $request->header('X-Wbox-Agent-Token')
            ?: Str::after($request->header('Authorization', ''), 'Bearer ');

        $token = trim($token);
        if ($token === '') {
            abort(401, 'WBOX Agent token is missing. Provide X-Wbox-Agent-Token or Authorization header.');
        }

        $settings = DB::table('system_settings')
            ->where('wbox_agent_token', $token)
            ->first();

        if ($settings === null) {
            abort(401, 'Invalid WBOX Agent token.');
        }

        return $settings;
    }

    /**
     * Agent Heartbeat: In-store agent reports folder readiness & machine health.
     */
    public function heartbeat(Request $request): JsonResponse
    {
        $settings = $this->authenticateAgent($request);
        $storeId = (int) ($settings->store_id ?? $settings->id);

        $data = $request->validate([
            'hostname' => ['nullable', 'string', 'max:128'],
            'request_path' => ['nullable', 'string', 'max:512'],
            'request_ok' => ['nullable', 'boolean'],
            'response_path' => ['nullable', 'string', 'max:512'],
            'response_ok' => ['nullable', 'boolean'],
            'version' => ['nullable', 'string', 'max:32'],
        ]);

        $updates = [
            'wbox_agent_last_heartbeat_at' => now(),
            'wbox_agent_hostname' => $data['hostname'] ?? null,
            'wbox_agent_request_ok' => (bool) ($data['request_ok'] ?? false),
            'wbox_agent_response_ok' => (bool) ($data['response_ok'] ?? false),
            'wbox_agent_version' => $data['version'] ?? '1.0.0',
            'updated_at' => now(),
        ];

        // If paths were reported by agent and not yet saved in cloud settings, save them
        if (! empty($data['request_path']) && empty($settings->wbox_request_path)) {
            $updates['wbox_request_path'] = $data['request_path'];
        }
        if (! empty($data['response_path']) && empty($settings->wbox_response_path)) {
            $updates['wbox_response_path'] = $data['response_path'];
        }

        DB::table('system_settings')->where('id', $settings->id)->update($updates);

        $pendingCount = DB::table('wbox_exports')
            ->where(function ($query) use ($storeId): void {
                $query->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->whereIn('status', ['pending', 'failed'])
            ->where(function ($query): void {
                $query->whereNull('available_at')->orWhere('available_at', '<=', now());
            })
            ->count();

        return response()->json([
            'status' => 'ok',
            'server_time' => now()->toIso8601String(),
            'store_id' => $storeId,
            'pending_orders' => $pendingCount,
        ]);
    }

    /**
     * Agent Poll: Retrieve the next pending order export for this store.
     */
    public function poll(Request $request): JsonResponse
    {
        $settings = $this->authenticateAgent($request);
        $storeId = (int) ($settings->store_id ?? $settings->id);

        $export = DB::table('wbox_exports')
            ->where(function ($query) use ($storeId): void {
                $query->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->whereIn('status', ['pending', 'failed'])
            ->where(function ($query): void {
                $query->whereNull('available_at')->orWhere('available_at', '<=', now());
            })
            ->orderBy('id')
            ->first();

        if ($export === null) {
            return response()->json(['export' => null]);
        }

        $order = DB::table('orders')->where('id', $export->order_id)->first();
        if ($order === null) {
            DB::table('wbox_exports')->where('id', $export->id)->update([
                'status' => 'failed',
                'last_error' => 'Order was deleted.',
                'updated_at' => now(),
            ]);
            return response()->json(['export' => null]);
        }

        $items = DB::table('order_items')->where('order_id', $order->id)->orderBy('id')->get();
        $terminal = DB::table('terminals')->where('id', $order->terminal_id)->first();

        $terminalSettings = clone $settings;
        $terminalSettings->wbox_kiosk_number = $terminal?->wbox_kiosk_number ?: ($terminal?->id ?: ($settings->wbox_kiosk_number ?: 'K01'));

        $authToken = '';
        if (filled($settings->wbox_auth_token_encrypted ?? null)) {
            try {
                $authToken = Crypt::decryptString($settings->wbox_auth_token_encrypted);
            } catch (Throwable) {
                $authToken = '';
            }
        }

        try {
            $xml = $this->requestBuilder->build($order, $items, $terminalSettings, $authToken);
        } catch (Throwable $e) {
            DB::table('wbox_exports')->where('id', $export->id)->update([
                'status' => 'failed',
                'last_error' => Str::limit($e->getMessage(), 1000, ''),
                'available_at' => now()->addSeconds(60),
                'updated_at' => now(),
            ]);

            return response()->json([
                'error' => 'Failed to build XML: ' . $e->getMessage(),
                'export' => null,
            ], 422);
        }

        $safeKiosk = preg_replace('/[^A-Za-z0-9_-]/', '', $terminalSettings->wbox_kiosk_number) ?: 'K01';
        $filename = $safeKiosk . 'Ticket#' . $order->id . '.request';
        $signalFilename = $safeKiosk . 'Ticket#' . $order->id . '.sig';

        DB::table('wbox_exports')->where('id', $export->id)->update([
            'status' => 'processing',
            'attempt_count' => DB::raw('attempt_count + 1'),
            'request_filename' => $filename,
            'request_hash' => hash('sha256', $xml),
            'updated_at' => now(),
        ]);

        return response()->json([
            'export' => [
                'id' => (int) $export->id,
                'order_id' => (int) $order->id,
                'order_number' => $order->order_number,
                'kiosk_number' => $terminalSettings->wbox_kiosk_number,
                'filename' => $filename,
                'signal_filename' => $signalFilename,
                'xml' => $xml,
                'xml_hash' => hash('sha256', $xml),
            ],
        ]);
    }

    /**
     * Agent Ack: Confirm that the export file was successfully written to the local Request folder.
     */
    public function ack(Request $request): JsonResponse
    {
        $settings = $this->authenticateAgent($request);
        $storeId = (int) ($settings->store_id ?? $settings->id);

        $data = $request->validate([
            'export_id' => ['required', 'integer'],
        ]);

        $export = DB::table('wbox_exports')
            ->where('id', $data['export_id'])
            ->where(function ($query) use ($storeId): void {
                $query->where('store_id', $storeId)->orWhereNull('store_id');
            })
            ->first();

        if ($export === null) {
            abort(404, 'Export record not found.');
        }

        DB::table('wbox_exports')->where('id', $export->id)->update([
            'status' => 'sent',
            'sent_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Export marked as sent to local POS folder.',
        ]);
    }

    /**
     * Agent Response: In-store agent uploads POS response from Response folder.
     */
    public function recordResponse(Request $request): JsonResponse
    {
        $settings = $this->authenticateAgent($request);
        $storeId = (int) ($settings->store_id ?? $settings->id);

        $data = $request->validate([
            'export_id' => ['nullable', 'integer'],
            'response_content' => ['required', 'string'],
            'is_success' => ['nullable', 'boolean'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        // If export_id not provided, find the most recent 'sent' export
        $exportId = $data['export_id'] ?? null;
        if ($exportId === null) {
            $export = DB::table('wbox_exports')
                ->where(function ($query) use ($storeId): void {
                    $query->where('store_id', $storeId)->orWhereNull('store_id');
                })
                ->where('status', 'sent')
                ->orderByDesc('sent_at')
                ->first();
            $exportId = $export?->id;
        } else {
            $export = DB::table('wbox_exports')
                ->where('id', $exportId)
                ->where(function ($query) use ($storeId): void {
                    $query->where('store_id', $storeId)->orWhereNull('store_id');
                })
                ->first();
        }

        if ($export === null) {
            return response()->json(['status' => 'ignored', 'message' => 'No active export waiting for response.'], 200);
        }

        $content = $data['response_content'];
        $hash = hash('sha256', $content);
        $isSuccess = $data['is_success'] ?? true;
        $msg = $data['message'] ?? 'Response received from local POS';

        DB::table('wbox_exports')->where('id', $export->id)->update([
            'status' => $isSuccess ? 'acknowledged' : 'failed',
            'response_hash' => $hash,
            'response_success' => $isSuccess,
            'response_message' => Str::limit($msg, 2000, ''),
            'acknowledged_at' => now(),
            'updated_at' => now(),
        ]);

        SecurityAuditService::log('wbox.agent.response', 'wbox_export', (string) $export->id, null, null, [
            'order_id' => $export->order_id,
            'is_success' => $isSuccess,
            'message' => $msg,
        ]);

        return response()->json([
            'status' => 'ok',
            'export_id' => $export->id,
            'order_id' => $export->order_id,
        ]);
    }
}
