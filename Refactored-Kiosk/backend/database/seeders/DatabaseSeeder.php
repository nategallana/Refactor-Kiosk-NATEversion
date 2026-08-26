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
            'brand_name' => 'KIOSK',
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

        $now = now();
        $categories = [
            ['id' => 1, 'name' => 'Main', 'display_order' => 1, 'active' => true],
            ['id' => 2, 'name' => 'Burgers', 'display_order' => 2, 'active' => true],
            ['id' => 3, 'name' => 'Combo Meals', 'display_order' => 3, 'active' => true],
            ['id' => 4, 'name' => 'Meals', 'display_order' => 4, 'active' => true],
            ['id' => 5, 'name' => 'Sides', 'display_order' => 5, 'active' => true],
            ['id' => 6, 'name' => 'Drinks', 'display_order' => 6, 'active' => true],
            ['id' => 7, 'name' => 'Desserts', 'display_order' => 7, 'active' => true],
        ];

        foreach ($categories as $cat) {
            DB::table('categories')->updateOrInsert(
                ['id' => $cat['id']],
                array_merge($cat, ['created_at' => $now, 'updated_at' => $now])
            );
        }

        $size = [
            'id' => 'size', 'name' => 'Size', 'required' => true, 'minSelections' => 1, 'maxSelections' => 1,
            'values' => [
                ['id' => 'regular', 'name' => 'Regular', 'priceDelta' => 0],
                ['id' => 'large', 'name' => 'Large', 'priceDelta' => 4500],
            ],
        ];
        $extras = [
            'id' => 'extras', 'name' => 'Extras', 'required' => false, 'minSelections' => 0, 'maxSelections' => 3,
            'values' => [
                ['id' => 'cheese', 'name' => 'Extra cheese', 'priceDelta' => 2500],
                ['id' => 'egg', 'name' => 'Sunny egg', 'priceDelta' => 3000],
                ['id' => 'bacon', 'name' => 'Crispy bacon', 'priceDelta' => 4500],
            ],
        ];
        $drink = [
            'id' => 'drink', 'name' => 'Drink choice', 'required' => true, 'minSelections' => 1, 'maxSelections' => 1,
            'values' => [
                ['id' => 'iced-tea', 'name' => 'House iced tea', 'priceDelta' => 0],
                ['id' => 'lemonade', 'name' => 'Fresh lemonade', 'priceDelta' => 1500],
            ],
        ];
        $burgerChoice = [
            'id' => 'burger-choice', 'name' => 'Burger choice', 'required' => true, 'minSelections' => 1, 'maxSelections' => 1,
            'values' => [
                ['id' => 'zinger', 'name' => 'Zinger burger with cheese', 'priceDelta' => 0],
                ['id' => 'bacon-burger', 'name' => 'Bacon Burger', 'priceDelta' => 2000],
            ],
        ];
        $comboSide = [
            'id' => 'side-choice', 'name' => 'Side choice', 'required' => true, 'minSelections' => 1, 'maxSelections' => 1,
            'values' => [
                ['id' => 'fries', 'name' => 'Golden fries', 'priceDelta' => 0],
                ['id' => 'spaghetti', 'name' => 'Classic spaghetti', 'priceDelta' => 2500],
            ],
        ];
        $optionGroupsBySku = [
            'CMB-001' => [$burgerChoice, $comboSide],
            'MEAL-001' => [$size, $drink, $extras],
            'BRG-001' => [$size, $extras],
            'MEAL-002' => [$size, $drink],
            'PASTA-001' => [$size, $extras],
            'SIDE-001' => [$size],
            'DRK-001' => [$size],
            'DSR-001' => [$size],
            'BRG-002' => [$size, $extras],
            'BRG-003' => [$size, $extras],
            'PASTA-002' => [$size],
            'SND-001' => [$size, $extras],
            'BRG-004' => [$size, $extras],
        ];

        $products = [
            ['id' => 1, 'category_id' => 3, 'sku' => 'CMB-001', 'name' => 'Burger Menu Combo', 'description' => 'Build your burger meal in two easy steps.', 'price_minor' => 25900, 'emoji' => '🍔', 'accent' => '#fff4ed', 'active' => true, 'available' => true],
            ['id' => 2, 'category_id' => 4, 'sku' => 'MEAL-001', 'name' => 'Crispy Chicken Plate', 'description' => 'Golden chicken, garlic rice, garden slaw, and house gravy.', 'price_minor' => 24900, 'emoji' => '🍗', 'accent' => '#fff5e9', 'active' => true, 'available' => true],
            ['id' => 3, 'category_id' => 2, 'sku' => 'BRG-001', 'name' => 'The House Burger', 'description' => 'Smashed beef, cheddar, pickles, onion, and secret sauce.', 'price_minor' => 21900, 'emoji' => '🍔', 'accent' => '#fff3e9', 'active' => true, 'available' => true],
            ['id' => 4, 'category_id' => 4, 'sku' => 'MEAL-002', 'name' => 'Chicken Rice Bowl', 'description' => 'Crispy chicken served with steamed rice and house gravy.', 'price_minor' => 23900, 'emoji' => '🍛', 'accent' => '#f7f5eb', 'active' => true, 'available' => true],
            ['id' => 5, 'category_id' => 4, 'sku' => 'PASTA-001', 'name' => 'Chicken Spaghetti', 'description' => 'Sweet-style spaghetti topped with a crispy chicken piece.', 'price_minor' => 18900, 'emoji' => '🍝', 'accent' => '#fff4eb', 'active' => true, 'available' => true],
            ['id' => 6, 'category_id' => 5, 'sku' => 'SIDE-001', 'name' => 'Golden Fries', 'description' => 'Crisp golden fries seasoned with sea salt.', 'price_minor' => 9900, 'emoji' => '🍟', 'accent' => '#fff8df', 'active' => true, 'available' => true],
            ['id' => 7, 'category_id' => 6, 'sku' => 'DRK-001', 'name' => 'Citrus Cooler', 'description' => 'A bright citrus drink served cold over ice.', 'price_minor' => 8900, 'emoji' => '🍹', 'accent' => '#fff6df', 'active' => true, 'available' => true],
            ['id' => 8, 'category_id' => 7, 'sku' => 'DSR-001', 'name' => 'Creamy Sundae', 'description' => 'Soft serve finished with a rich chocolate swirl.', 'price_minor' => 7900, 'emoji' => '🍦', 'accent' => '#fff4f1', 'active' => true, 'available' => true],
            ['id' => 9, 'category_id' => 2, 'sku' => 'BRG-002', 'name' => 'Big Burger', 'description' => 'A hearty double-stack burger with our signature sauce.', 'price_minor' => 22900, 'emoji' => '🍔', 'accent' => '#fff2e8', 'active' => true, 'available' => true],
            ['id' => 10, 'category_id' => 2, 'sku' => 'BRG-003', 'name' => 'Double Cheese Burger', 'description' => 'Two beef patties layered with melted cheese.', 'price_minor' => 23900, 'emoji' => '🍔', 'accent' => '#fff5e9', 'active' => true, 'available' => true],
            ['id' => 11, 'category_id' => 4, 'sku' => 'PASTA-002', 'name' => 'Classic Spaghetti', 'description' => 'Comforting sweet-style spaghetti with grated cheese.', 'price_minor' => 14900, 'emoji' => '🍝', 'accent' => '#fff4ed', 'active' => true, 'available' => true],
            ['id' => 12, 'category_id' => 1, 'sku' => 'SND-001', 'name' => 'Chicken Sandwich', 'description' => 'Crispy chicken, lettuce, and creamy dressing in a soft bun.', 'price_minor' => 17900, 'emoji' => '🥪', 'accent' => '#f7f6ec', 'active' => true, 'available' => true],
            ['id' => 13, 'category_id' => 2, 'sku' => 'BRG-004', 'name' => 'Bacon Burger', 'description' => 'A juicy beef burger finished with crisp smoky bacon.', 'price_minor' => 22900, 'emoji' => '🍔', 'accent' => '#fff2e8', 'active' => true, 'available' => false],
        ];

        foreach ($products as $prod) {
            DB::table('products')->updateOrInsert(
                ['id' => $prod['id']],
                array_merge($prod, [
                    'option_groups_json' => json_encode($optionGroupsBySku[$prod['sku']], JSON_THROW_ON_ERROR),
                    'created_at' => $now,
                    'updated_at' => $now,
                ])
            );
        }
    }
}
