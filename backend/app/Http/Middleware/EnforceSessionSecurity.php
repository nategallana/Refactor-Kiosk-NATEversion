<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class EnforceSessionSecurity
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $now = now();

            // 1. Maximum Session Limit: 8 hours (480 minutes)
            $createdAt = $token->created_at instanceof Carbon ? $token->created_at : Carbon::parse((string) $token->created_at);
            if ($createdAt->lessThanOrEqualTo($now->copy()->subHours(8))) {
                $token->delete();
                Cache::forget("token_activity:{$token->id}");

                return response()->json(['message' => 'Session exceeded maximum duration of 8 hours. Please sign in again.'], 401);
            }

            // 2. Idle Timeout: 15 minutes of inactivity
            $lastActivityStr = Cache::get("token_activity:{$token->id}");
            if ($lastActivityStr) {
                $lastActivity = Carbon::parse((string) $lastActivityStr);
                if ($lastActivity->lessThanOrEqualTo($now->copy()->subMinutes(15))) {
                    $token->delete();
                    Cache::forget("token_activity:{$token->id}");

                    return response()->json(['message' => 'Session timed out due to 15 minutes of inactivity.'], 401);
                }
            }

            // 3. Token Expiration: 30 minutes
            if ($token->expires_at) {
                $expiresAt = $token->expires_at instanceof Carbon ? $token->expires_at : Carbon::parse((string) $token->expires_at);
                if ($expiresAt->isPast()) {
                    $token->delete();
                    Cache::forget("token_activity:{$token->id}");

                    return response()->json(['message' => 'Your session has expired. Please sign in again.'], 401);
                }
            }

            Cache::put("token_activity:{$token->id}", $now->toIso8601String(), $now->copy()->addHours(9));
        }

        return $next($request);
    }
}
