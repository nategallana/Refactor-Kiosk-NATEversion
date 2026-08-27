<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
        $user->tokens()->where('name', 'admin-dashboard')->delete();

        return response()->json([
            'token' => $user->createToken('admin-dashboard', ['admin'])->plainTextToken,
            'user' => $user->only(['id', 'name', 'email', 'role']),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->only(['id', 'name', 'email', 'role'])]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }
}
