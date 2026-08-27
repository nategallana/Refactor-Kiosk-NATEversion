<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlatformController extends Controller
{
    public function stores(): JsonResponse
    {
        return response()->json(['stores' => DB::table('stores')->orderBy('name')->get()]);
    }

    public function createStore(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120'], 'code' => ['required', 'string', 'max:32', 'alpha_dash', 'unique:stores,code'], 'timezone' => ['nullable', 'timezone']]);
        $id = DB::table('stores')->insertGetId(['name' => $data['name'], 'code' => strtoupper($data['code']), 'timezone' => $data['timezone'] ?? 'Asia/Manila', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit($request, 'store.created', 'store', (string) $id, null, ['name' => $data['name'], 'code' => strtoupper($data['code'])]);
        return response()->json(['store' => DB::table('stores')->find($id)], 201);
    }

    public function updateStore(Request $request, int $storeId): JsonResponse
    {
        $store = DB::table('stores')->find($storeId);
        abort_unless($store, 404, 'Store not found.');
        $data = $request->validate(['name' => ['sometimes', 'string', 'max:120'], 'timezone' => ['sometimes', 'timezone'], 'active' => ['sometimes', 'boolean']]);
        DB::table('stores')->where('id', $storeId)->update(array_merge($data, ['updated_at' => now()]));
        $this->audit($request, 'store.updated', 'store', (string) $storeId, (array) $store, $data);
        return response()->json(['store' => DB::table('stores')->find($storeId)]);
    }

    public function users(): JsonResponse
    {
        $users = DB::table('users')->leftJoin('store_user', 'store_user.user_id', '=', 'users.id')->leftJoin('stores', 'stores.id', '=', 'store_user.store_id')->select('users.id', 'users.name', 'users.email', 'users.role', 'users.created_at', 'stores.id as store_id', 'stores.name as store_name', 'store_user.role as store_role')->orderBy('users.name')->get();
        return response()->json(['users' => $users]);
    }

    public function updateUser(Request $request, int $userId): JsonResponse
    {
        $user = User::query()->findOrFail($userId);
        abort_if($user->id === $request->user()->id && $request->input('role') !== 'super_admin', 422, 'You cannot remove your own Super Admin access.');
        $data = $request->validate(['name' => ['sometimes', 'string', 'max:120'], 'role' => ['sometimes', 'in:super_admin,store_admin'], 'store_id' => ['nullable', 'integer', 'exists:stores,id']]);
        $user->update(array_intersect_key($data, array_flip(['name', 'role'])));
        if (array_key_exists('store_id', $data)) {
            DB::table('store_user')->where('user_id', $user->id)->delete();
            if ($data['store_id']) DB::table('store_user')->insert(['store_id' => $data['store_id'], 'user_id' => $user->id, 'role' => 'store_admin', 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->audit($request, 'user.updated', 'user', (string) $user->id, null, ['role' => $user->role, 'store_id' => $data['store_id'] ?? null]);
        return response()->json(['user' => $user->fresh()]);
    }

    public function terminals(Request $request): JsonResponse
    {
        $query = DB::table('terminals')->leftJoin('stores', 'stores.id', '=', 'terminals.store_id')->select('terminals.*', 'stores.name as store_name')->where('terminals.status', '!=', 'decommissioned');
        if ($request->filled('store_id')) $query->where('terminals.store_id', $request->integer('store_id'));
        return response()->json(['terminals' => $query->orderBy('terminals.id')->get()->map(function (object $terminal): object { $terminal->is_online = $terminal->last_heartbeat_at !== null && now()->diffInSeconds($terminal->last_heartbeat_at) < 60; return $terminal; })]);
    }

    public function report(Request $request): JsonResponse
    {
        $query = DB::table('orders')->leftJoin('stores', 'stores.id', '=', 'orders.store_id')->where('orders.payment_status', 'paid');
        if ($request->filled('from')) $query->whereDate('orders.placed_at', '>=', $request->date('from'));
        if ($request->filled('to')) $query->whereDate('orders.placed_at', '<=', $request->date('to'));
        $summary = (clone $query)->selectRaw('COUNT(*) as orders_count, COALESCE(SUM(total_minor), 0) as sales_minor')->first();
        $byStore = $query->select('stores.id', 'stores.name')->selectRaw('COUNT(orders.id) as orders_count, COALESCE(SUM(orders.total_minor), 0) as sales_minor')->groupBy('stores.id', 'stores.name')->orderByDesc('sales_minor')->get();
        return response()->json(['summary' => $summary, 'by_store' => $byStore]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $logs = DB::table('audit_logs')->leftJoin('users', 'users.id', '=', 'audit_logs.actor_id')->select('audit_logs.*', 'users.name as actor_name', 'users.email as actor_email')->when($request->filled('action'), fn ($q) => $q->where('action', $request->string('action')))->latest('audit_logs.created_at')->paginate(min($request->integer('per_page', 50), 100));
        return response()->json($logs);
    }

    public function impersonate(Request $request, int $userId): JsonResponse
    {
        $data = $request->validate(['store_id' => ['required', 'integer', 'exists:stores,id'], 'reason' => ['required', 'string', 'min:5', 'max:500']]);
        $target = User::query()->findOrFail($userId);
        abort_if($target->isSuperAdmin(), 422, 'Super Admin accounts cannot be impersonated.');
        abort_unless(DB::table('store_user')->where(['store_id' => $data['store_id'], 'user_id' => $target->id])->exists(), 422, 'User is not assigned to this store.');
        $plain = Str::random(80);
        $sessionId = DB::table('impersonation_sessions')->insertGetId(['super_admin_id' => $request->user()->id, 'target_user_id' => $target->id, 'store_id' => $data['store_id'], 'token_hash' => hash('sha256', $plain), 'reason' => $data['reason'], 'expires_at' => now()->addMinutes(30), 'created_at' => now(), 'updated_at' => now()]);
        $token = $target->createToken('impersonation-'.$sessionId, ['admin', 'impersonated'])->plainTextToken;
        $this->audit($request, 'impersonation.started', 'user', (string) $target->id, null, ['session_id' => $sessionId, 'store_id' => $data['store_id'], 'reason' => $data['reason']]);
        return response()->json(['session_id' => $sessionId, 'token' => $token, 'expires_at' => now()->addMinutes(30)->toISOString(), 'user' => $target->only(['id', 'name', 'email', 'role'])]);
    }

    public function endImpersonation(Request $request, int $sessionId): JsonResponse
    {
        $session = DB::table('impersonation_sessions')->where('id', $sessionId)->where('super_admin_id', $request->user()->id)->first();
        abort_unless($session, 404, 'Impersonation session not found.');
        DB::table('impersonation_sessions')->where('id', $sessionId)->update(['ended_at' => now(), 'updated_at' => now()]);
        User::query()->find($session->target_user_id)?->tokens()->where('name', 'impersonation-'.$sessionId)->delete();
        $this->audit($request, 'impersonation.ended', 'user', (string) $session->target_user_id, null, ['session_id' => $sessionId]);
        return response()->json(['message' => 'Impersonation session ended.']);
    }

    private function audit(Request $request, string $action, string $type, string $id, ?array $before, ?array $after): void
    {
        DB::table('audit_logs')->insert(['actor_id' => $request->user()->id, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id, 'before' => $before ? json_encode($before) : null, 'after' => $after ? json_encode($after) : null, 'created_at' => now()]);
    }
}
