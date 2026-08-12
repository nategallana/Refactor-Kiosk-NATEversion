<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@kiosk.local'],
            ['name' => 'Kiosk Administrator', 'password' => Hash::make('Admin123!'), 'role' => 'admin'],
        );
        DB::table('system_settings')->insertOrIgnore([
            'id' => 1,
            'brand_name' => 'Table & Company',
            'tax_rate_basis_points' => 1200,
            'service_mode' => 'both',
            'currency' => 'PHP',
            'counter_payment_enabled' => true,
            'card_payment_enabled' => true,
            'idle_timeout_seconds' => 120,
            'auto_reset_seconds' => 15,
            'receipt_header' => 'Thank you for dining with us.',
            'receipt_footer' => 'Please keep this receipt for your order.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        if (DB::table('categories')->exists()) {
            return;
        }

        $now = now();
        DB::table('categories')->insert([
            ['id' => 1, 'name' => 'Featured', 'display_order' => 1, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 2, 'name' => 'Meals', 'display_order' => 2, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['id' => 3, 'name' => 'Drinks', 'display_order' => 3, 'active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('products')->insert([
            ['category_id' => 1, 'sku' => 'MEAL-001', 'name' => 'Crispy Chicken Plate', 'description' => 'Golden chicken, garlic rice, garden slaw, and gravy.', 'price_minor' => 24900, 'emoji' => '🍗', 'accent' => '#EFC767', 'active' => true, 'available' => true, 'created_at' => $now, 'updated_at' => $now],
            ['category_id' => 1, 'sku' => 'BRG-001', 'name' => 'The House Burger', 'description' => 'Smashed beef, cheddar, pickles, onion, and secret sauce.', 'price_minor' => 21900, 'emoji' => '🍔', 'accent' => '#DF8F65', 'active' => true, 'available' => true, 'created_at' => $now, 'updated_at' => $now],
            ['category_id' => 3, 'sku' => 'DRK-001', 'name' => 'Citrus Cooler', 'description' => 'Lemon, orange, mint, and sparkling water.', 'price_minor' => 8900, 'emoji' => '🍊', 'accent' => '#F3AA72', 'active' => true, 'available' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('orders')->insert([
            ['order_number' => '1042', 'terminal_id' => 'KIOSK-01', 'dining_type' => 'dine-in', 'subtotal_minor' => 24900, 'tax_minor' => 2988, 'total_minor' => 27888, 'payment_status' => 'paid', 'fulfillment_status' => 'preparing', 'placed_at' => now()->subMinutes(8), 'created_at' => $now, 'updated_at' => $now],
            ['order_number' => '1041', 'terminal_id' => 'KIOSK-02', 'dining_type' => 'takeout', 'subtotal_minor' => 30800, 'tax_minor' => 3696, 'total_minor' => 34496, 'payment_status' => 'paid', 'fulfillment_status' => 'ready', 'placed_at' => now()->subMinutes(16), 'created_at' => $now, 'updated_at' => $now],
            ['order_number' => '1040', 'terminal_id' => 'KIOSK-01', 'dining_type' => 'dine-in', 'subtotal_minor' => 21900, 'tax_minor' => 2628, 'total_minor' => 24528, 'payment_status' => 'pending', 'fulfillment_status' => 'pending', 'placed_at' => now()->subMinutes(23), 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
}
