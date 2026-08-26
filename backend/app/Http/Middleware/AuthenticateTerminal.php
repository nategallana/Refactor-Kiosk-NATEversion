<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateTerminal
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if ($token === null) {
            return response()->json(['message' => 'Terminal authentication required.'], 401);
        }

        $terminal = DB::table('terminals')
            ->where('api_token', hash('sha256', $token))
            ->first();

        if ($terminal === null || $terminal->status === 'decommissioned') {
            return response()->json(['message' => 'Invalid or decommissioned terminal.'], 401);
        }

        $request->attributes->set('_terminal', $terminal);

        return $next($request);
    }
}
