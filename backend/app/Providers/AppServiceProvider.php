<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Phase 12: Rate limiters
        // 1. General Login: 10/minute/IP
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // 2. Super Admin Login: 5/minute/IP
        RateLimiter::for('super_admin_login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // 3. Two-Factor Authentication: 5/minute/user
        RateLimiter::for('two_factor', function (Request $request) {
            $userKey = $request->user()?->id ?: $request->input('email', $request->ip());

            return Limit::perMinute(5)->by((string) $userKey);
        });

        // 4. Impersonation: 10/hour/user
        RateLimiter::for('impersonation', function (Request $request) {
            $userKey = $request->user()?->id ?: $request->ip();

            return Limit::perHour(10)->by((string) $userKey);
        });

        // 5. Terminal Registration: 5/minute/IP
        RateLimiter::for('terminal_registration', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // 6. WBOX Retry: 30/minute/user
        RateLimiter::for('wbox_retry', function (Request $request) {
            $userKey = $request->user()?->id ?: $request->ip();

            return Limit::perMinute(30)->by((string) $userKey);
        });
    }
}
