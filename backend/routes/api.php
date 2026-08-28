<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\AdminTerminalController;
use App\Http\Controllers\Api\AdminWboxController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\PlatformController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Middleware\AuthenticateTerminal;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // Terminal self-service (no auth required for registration)
    Route::post('/terminals/register', [TerminalController::class, 'register']);

    // Terminal-authenticated routes
    Route::middleware(AuthenticateTerminal::class)->group(function (): void {
        Route::post('/terminals/heartbeat', [TerminalController::class, 'heartbeat']);
        Route::get('/terminals/config', [TerminalController::class, 'config']);
    });

    Route::get('/settings', [AdminSettingsController::class, 'publicShow'])->middleware(AuthenticateTerminal::class);
    Route::get('/catalog', [AdminCatalogController::class, 'index'])->middleware(AuthenticateTerminal::class);
    Route::post('/orders', [OrderController::class, 'store'])->middleware(AuthenticateTerminal::class);
    Route::post('/payments/webhook/{provider}', [PaymentWebhookController::class, 'handle']);
    Route::post('/admin/auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:login');
    Route::middleware(['auth:sanctum', 'session.security', 'store.context'])->prefix('admin')->group(function (): void {
        Route::get('/auth/me', [AdminAuthController::class, 'me']);
        Route::post('/auth/logout', [AdminAuthController::class, 'logout']);
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/catalog', [AdminCatalogController::class, 'index']);
        Route::patch('/products/{product}/availability', [AdminCatalogController::class, 'availability']);
        Route::patch('/products/{product}/wbox-mapping', [AdminCatalogController::class, 'wboxMapping']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
        Route::post('/orders/{order}/wbox/retry', [AdminWboxController::class, 'retry'])->middleware('throttle:wbox_retry');
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
        Route::get('/wbox/status', [AdminWboxController::class, 'status']);

        // Session & Security Management
        Route::get('/sessions', [AdminAuthController::class, 'sessions']);
        Route::delete('/sessions/{sessionId}', [AdminAuthController::class, 'revokeSession']);
        Route::delete('/sessions', [AdminAuthController::class, 'revokeAllSessions']);
        Route::post('/password/change', [AdminAuthController::class, 'changePassword']);

        // Admin terminal management
        Route::get('/terminals', [AdminTerminalController::class, 'index']);
        Route::post('/terminals', [AdminTerminalController::class, 'store'])->middleware('throttle:terminal_registration');
        Route::patch('/terminals/{terminalId}', [AdminTerminalController::class, 'update']);
        Route::delete('/terminals/{terminalId}', [AdminTerminalController::class, 'destroy']);
        Route::post('/terminals/{terminalId}/command', [AdminTerminalController::class, 'command']);
    });

    Route::middleware(['auth:sanctum', 'session.security', 'super_admin'])->prefix('platform')->group(function (): void {
        Route::get('/stores', [PlatformController::class, 'stores']);
        Route::post('/stores', [PlatformController::class, 'createStore']);
        Route::patch('/stores/{storeId}', [PlatformController::class, 'updateStore']);
        Route::get('/users', [PlatformController::class, 'users']);
        Route::patch('/users/{userId}', [PlatformController::class, 'updateUser']);
        Route::get('/users/{userId}/sessions', [PlatformController::class, 'userSessions']);
        Route::delete('/users/{userId}/sessions/{tokenId}', [PlatformController::class, 'revokeUserSession']);
        Route::delete('/users/{userId}/sessions', [PlatformController::class, 'revokeAllUserSessions']);
        Route::get('/terminals', [PlatformController::class, 'terminals']);
        Route::get('/reports/sales', [PlatformController::class, 'report']);
        Route::get('/audit-logs', [PlatformController::class, 'auditLogs']);
        Route::post('/impersonation/{userId}', [PlatformController::class, 'impersonate'])->middleware('throttle:impersonation');
        Route::delete('/impersonation/{sessionId}', [PlatformController::class, 'endImpersonation']);
    });
});
