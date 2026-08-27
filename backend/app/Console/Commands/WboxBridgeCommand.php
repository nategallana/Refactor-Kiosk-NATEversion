<?php

namespace App\Console\Commands;

use App\Services\WboxBridge;
use Illuminate\Console\Command;

class WboxBridgeCommand extends Command
{
    protected $signature = 'wbox:bridge {--once : Run one bridge cycle and exit} {--sleep=2 : Seconds between bridge cycles}';

    protected $description = 'Deliver queued kiosk orders to WBOX and process WBOX responses';

    public function handle(WboxBridge $bridge): int
    {
        $sleep = max(1, (int) $this->option('sleep'));

        do {
            $result = $bridge->runOnce();
            if (! $result['enabled']) {
                $this->warn('WBOX integration is disabled.');

                return self::SUCCESS;
            }
            if ($result['response'] !== null) {
                $this->line('Response: '.$result['response']);
            }
            if ($result['export'] !== null) {
                $this->line('Export: '.$result['export']);
            }

            if (! $this->option('once')) {
                sleep($sleep);
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
