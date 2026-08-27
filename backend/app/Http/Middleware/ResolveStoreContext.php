<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ResolveStoreContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $requested = $request->header('X-Store-Id');
        $query = DB::table('store_user')->where('user_id', $user->id);
        if ($requested !== null && $user->isSuperAdmin()) $query->where('store_id', (int) $requested);
        $storeId = $query->value('store_id');
        abort_unless($storeId, 403, 'No store access is assigned to this account.');
        $request->attributes->set('store_id', (int) $storeId);
        return $next($request);
    }
}
