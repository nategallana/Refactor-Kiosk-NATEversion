<?php

use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminCatalogController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminSettingsController;
use App\Http\Controllers\Api\OrderController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::get('/settings', [AdminSettingsController::class, 'show']);
    Route::get('/catalog', [AdminCatalogController::class, 'index']);
    Route::post('/orders', [OrderController::class, 'store']);
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
        Route::post('/settings/upload-background', [AdminSettingsController::class, 'uploadBackground']);
    });
});
