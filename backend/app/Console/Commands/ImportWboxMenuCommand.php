<?php

namespace App\Console\Commands;

use App\Services\WboxMenuImporter;
use Illuminate\Console\Command;

class ImportWboxMenuCommand extends Command
{
    protected $signature = 'catalog:import-wbox-menu 
                            {--path= : Absolute or relative path to Menu.txt}
                            {--category-db= : Path to Category.DB file}
                            {--store=1 : Store ID to associate items with}';

    protected $description = 'Import WBOX POS menu items from Menu.txt into the kiosk catalog';

    public function handle(WboxMenuImporter $importer): int
    {
        $this->info('Starting WBOX POS Menu Import...');

        $menuPath = $this->option('path') ? (string) $this->option('path') : null;
        $categoryDbPath = $this->option('category-db') ? (string) $this->option('category-db') : null;
        $storeId = (int) $this->option('store');

        try {
            $result = $importer->import($menuPath, $categoryDbPath, $storeId);

            $this->info("Import completed successfully from: {$result['file_path']}");
            $this->table(
                ['Metric', 'Count'],
                [
                    ['New Products Created', $result['imported_products']],
                    ['Products Updated', $result['updated_products']],
                    ['Categories Created', $result['categories_created']],
                    ['Total Categories Active', $result['categories_existing']],
                ]
            );

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('Menu import failed: ' . $e->getMessage());
            return self::FAILURE;
        }
    }
}

