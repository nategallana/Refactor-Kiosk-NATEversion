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
        if ($user === null) {
            abort(401, 'Unauthenticated.');
        }

        $requestedHeader = $request->header('X-Store-Id');

        if ($user->isSuperAdmin()) {
            if ($requestedHeader !== null && $requestedHeader !== '') {
                $storeId = DB::table('stores')
                    ->where('id', (int) $requestedHeader)
                    ->where('active', true)
                    ->value('id');
                abort_unless($storeId, 403, 'Requested store context is invalid or inactive.');
            } else {
                $storeId = DB::table('store_user')->where('user_id', $user->id)->value('store_id')
                    ?: DB::table('stores')->where('active', true)->value('id');
                abort_unless($storeId, 403, 'No active store available.');
            }
        } else {
            // Regular store admin: must be assigned in store_user
            $storeId = DB::table('store_user')
                ->where('user_id', $user->id)
                ->value('store_id');
            abort_unless($storeId, 403, 'No store access is assigned to this account.');
        }

        $request->attributes->set('store_id', (int) $storeId);

        return $next($request);
    }
}

