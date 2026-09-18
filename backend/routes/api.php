<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\AdminWboxAgentController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/settings', [AdminSettingsController::class, 'publicShow']);
    Route::get('/catalog', [AdminCatalogController::class, 'index']);
    Route::get('/orders', [AdminOrderController::class, 'index']);
    Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/admin/auth/login', [AdminAuthController::class, 'login'])->middleware('throttle:10,1');

    // In-Store WBOX Sync Agent Routes (Authenticated via agent token)
    Route::prefix('wbox/agent')->group(function (): void {
        Route::post('/heartbeat', [AdminWboxAgentController::class, 'heartbeat']);
        Route::get('/poll', [AdminWboxAgentController::class, 'poll']);
        Route::post('/ack', [AdminWboxAgentController::class, 'ack']);
        Route::post('/response', [AdminWboxAgentController::class, 'recordResponse']);
    });

    Route::middleware('auth:sanctum')->prefix('admin')->group(function (): void {
        Route::get('/auth/me', [AdminAuthController::class, 'me']);
        Route::post('/auth/logout', [AdminAuthController::class, 'logout']);
        Route::get('/dashboard', AdminDashboardController::class);
        Route::get('/catalog', [AdminCatalogController::class, 'index']);
        Route::patch('/products/{product}/availability', [AdminCatalogController::class, 'availability']);
        Route::patch('/products/{product}/wbox-mapping', [AdminCatalogController::class, 'wboxMapping']);
        Route::put('/products/{product}/wbox-mapping', [AdminCatalogController::class, 'wboxMapping']);
        Route::post('/catalog/wbox-sync', [AdminCatalogController::class, 'wboxSync']);
        Route::post('/catalog/import-menu-txt', [AdminCatalogController::class, 'importFromMenuTxt']);
        Route::get('/orders', [AdminOrderController::class, 'index']);
        Route::patch('/orders/{order}/status', [AdminOrderController::class, 'updateStatus']);
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::put('/settings', [AdminSettingsController::class, 'update']);
        Route::post('/settings/upload-background', [AdminSettingsController::class, 'uploadBackground']);
        Route::get('/settings/wbox/status', [AdminSettingsController::class, 'wboxStatus']);
        Route::post('/settings/wbox/regenerate-agent-token', [AdminSettingsController::class, 'regenerateAgentToken']);
        Route::post('/orders/{order}/wbox-retry', [AdminOrderController::class, 'wboxRetry']);
    });
});

