<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AdminTerminalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $terminals = DB::table('terminals')
            ->where('store_id', $storeId)
            ->where('status', '!=', 'decommissioned')
            ->orderBy('id')
            ->get()
            ->map(function (object $t): object {
                $t->is_online = $t->last_heartbeat_at !== null
                    && now()->diffInSeconds($t->last_heartbeat_at) < 60;

                return $t;
            });

        return response()->json(['terminals' => $terminals]);
    }

    public function store(Request $request): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $data = $request->validate([
            'terminal_id' => ['required', 'string', 'max:64', 'regex:/^[A-Z0-9][A-Z0-9\-]{0,63}$/i'],
            'name' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'service_mode' => ['nullable', 'string', 'in:both,dine-in,takeout'],
            'wbox_kiosk_number' => ['nullable', 'string', 'max:32', 'regex:/^[A-Z0-9][A-Z0-9_-]*$/i'],
        ]);

        if (DB::table('terminals')->where('id', $data['terminal_id'])->exists()) {
            return response()->json(['message' => 'Terminal ID already exists.'], 409);
        }

        $plainToken = Str::random(64);

        DB::table('terminals')->insert([
            'id' => $data['terminal_id'],
            'name' => $data['name'],
            'location' => $data['location'] ?? null,
            'service_mode' => $data['service_mode'] ?? null,
            'store_id' => $storeId,
            'wbox_kiosk_number' => $data['wbox_kiosk_number'] ?? $data['terminal_id'],
            'api_token' => hash('sha256', $plainToken),
            'status' => 'online',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        \App\Services\SecurityAuditService::log('terminal.registered', 'terminal', $data['terminal_id'], $request->user()->id, null, [
            'name' => $data['name'],
            'location' => $data['location'] ?? null,
            'store_id' => $storeId,
        ]);

        return response()->json([
            'terminal_id' => $data['terminal_id'],
            'api_token' => $plainToken,
            'message' => 'Terminal created. Store the API token securely.',
        ], 201);
    }

    public function update(Request $request, string $terminalId): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $terminal = DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->first();
        if ($terminal === null) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'service_mode' => ['nullable', 'string', 'in:both,dine-in,takeout'],
            'screen_profile' => ['sometimes', 'string', 'max:32'],
            'status' => ['sometimes', 'string', 'in:online,maintenance'],
        ]);

        $before = (array) $terminal;

        DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->update(array_merge($data, ['updated_at' => now()]));

        \App\Services\SecurityAuditService::log('terminal.updated', 'terminal', $terminalId, $request->user()->id, array_intersect_key($before, $data), $data);

        return response()->json(['terminal' => DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->first()]);
    }

    public function destroy(Request $request, string $terminalId): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $terminal = DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->first();
        if ($terminal === null) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->update([
            'status' => 'decommissioned',
            'updated_at' => now(),
        ]);

        \App\Services\SecurityAuditService::log('terminal.revoked', 'terminal', $terminalId, $request->user()->id, ['status' => $terminal->status], ['status' => 'decommissioned']);

        return response()->json(['message' => 'Terminal decommissioned.']);
    }

    public function command(Request $request, string $terminalId): JsonResponse
    {
        $storeId = (int) $request->attributes->get('store_id');
        $terminal = DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->first();
        if ($terminal === null) {
            return response()->json(['message' => 'Terminal not found.'], 404);
        }

        $data = $request->validate([
            'command' => ['required', 'string', 'in:reload,lock,unlock'],
        ]);

        if ($data['command'] === 'lock') {
            DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->update(['status' => 'maintenance', 'updated_at' => now()]);
        } elseif ($data['command'] === 'unlock') {
            DB::table('terminals')->where('id', $terminalId)->where('store_id', $storeId)->update(['status' => 'online', 'updated_at' => now()]);
        }
        // 'reload' is a no-op on the backend; the kiosk picks it up via heartbeat

        DB::table('audit_logs')->insert([
            'actor_id' => $request->user()->id,
            'action' => 'terminal.command',
            'entity_type' => 'terminal',
            'entity_id' => $terminalId,
            'before' => null,
            'after' => json_encode(['command' => $data['command']]),
            'created_at' => now(),
        ]);

        return response()->json(['message' => "Command '{$data['command']}' sent to {$terminalId}."]);
    }
}
