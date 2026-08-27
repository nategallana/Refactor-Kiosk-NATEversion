<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class AdminAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $user = User::query()->where('email', $credentials['email'])->first();
        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json(['message' => 'The email or password is incorrect.'], 422);
        }
        if (! in_array($user->role, ['store_admin', 'super_admin'], true)) {
            return response()->json(['message' => 'This account cannot access the admin dashboard.'], 403);
        }

        $tokenObj = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));
        $tokenObj->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'last_used_at' => now(),
        ])->save();

        Cache::put("token_activity:{$tokenObj->accessToken->id}", now()->toIso8601String(), now()->addHours(9));

        return response()->json([
            'token' => $tokenObj->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only(['id', 'name', 'email', 'role'])]);
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentTokenId = $request->user()->currentAccessToken()?->id;

        $sessions = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $request->user()->id)
            ->orderByDesc('last_used_at')
            ->get()
            ->map(function ($token) use ($currentTokenId) {
                return [
                    'id' => $token->id,
                    'name' => $token->name,
                    'ip_address' => $token->ip_address,
                    'user_agent' => $token->user_agent,
                    'last_activity_at' => $token->last_used_at ?? $token->created_at,
                    'created_at' => $token->created_at,
                    'is_current' => $token->id === $currentTokenId,
                ];
            });

        return response()->json(['sessions' => $sessions]);
    }

    public function revokeSession(Request $request, int $sessionId): JsonResponse
    {
        $token = $request->user()->tokens()->where('id', $sessionId)->first();
        if (! $token) {
            return response()->json(['message' => 'Session not found.'], 404);
        }

        Cache::forget("token_activity:{$token->id}");
        $token->delete();

        return response()->json(['message' => 'Session revoked.']);
    }

    public function revokeAllSessions(Request $request): JsonResponse
    {
        $tokens = $request->user()->tokens()->get();
        foreach ($tokens as $token) {
            Cache::forget("token_activity:{$token->id}");
            $token->delete();
        }

        return response()->json(['message' => 'All active sessions revoked.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password does not match.'], 422);
        }

        $user->forceFill(['password' => Hash::make($data['password'])])->save();

        // Auto-revoke all tokens on password change
        $tokens = $user->tokens()->get();
        foreach ($tokens as $token) {
            Cache::forget("token_activity:{$token->id}");
            $token->delete();
        }

        // Generate new session token
        $newToken = $user->createToken('admin-dashboard', ['admin'], now()->addMinutes(30));
        $newToken->accessToken->forceFill([
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'last_used_at' => now(),
        ])->save();

        Cache::put("token_activity:{$newToken->accessToken->id}", now()->toIso8601String(), now()->addHours(9));

        return response()->json([
            'message' => 'Password updated successfully. All other sessions have been logged out.',
            'token' => $newToken->plainTextToken,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            Cache::forget("token_activity:{$token->id}");
            $token->delete();
        }

        return response()->json(['message' => 'Signed out.']);
    }
}
