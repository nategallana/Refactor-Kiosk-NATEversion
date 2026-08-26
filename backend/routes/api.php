<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\TerminalController;
use App\Http\Controllers\Api\AdminTerminalController;
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

    Route::get('/settings', [AdminSettingsController::class, 'show']);
    Route::get('/catalog', [AdminCatalogController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/payments/webhook/{provider}', [\App\Http\Controllers\Api\PaymentWebhookController::class, 'handle']);
    Route::post('/admin/auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:10,1');
    Route::middleware('auth:sanctum')->prefix('admin')->group(function (): void {
        Route::get('/auth/me', [AdminAuthController::class, 'me']);
        Route::post('/auth/logout', [AdminAuthController::class, 'logout']);
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/catalog', [AdminCatalogController::class, 'index']);
        Route::patch('/products/{product}/availability', [AdminCatalogController::class, 'availability']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
        
        // Admin terminal management
        Route::get('/terminals', [AdminTerminalController::class, 'index']);
        Route::post('/terminals', [AdminTerminalController::class, 'store']);
        Route::patch('/terminals/{terminalId}', [AdminTerminalController::class, 'update']);
        Route::delete('/terminals/{terminalId}', [AdminTerminalController::class, 'destroy']);
        Route::post('/terminals/{terminalId}/command', [AdminTerminalController::class, 'command']);
    });
});
