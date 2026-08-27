$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$databasePath = Join-Path $backendRoot 'database\database.sqlite'
$phpCommand = (Get-Command php -ErrorAction SilentlyContinue).Source

if (-not $phpCommand) {
    $phpCommand = Join-Path $env:USERPROFILE '.config\herd\bin\php.bat'
}
if (-not (Test-Path -LiteralPath $phpCommand)) {
    throw 'PHP was not found. Start Laravel Herd or add PHP to your PATH.'
}

$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $databasePath
$env:SESSION_DRIVER = 'file'
$env:CACHE_STORE = 'file'
$env:QUEUE_CONNECTION = 'sync'

Set-Location -LiteralPath $backendRoot
Write-Host 'WBOX bridge is monitoring queued orders and POS responses.' -ForegroundColor Green
Write-Host 'Press Ctrl+C to stop the bridge.' -ForegroundColor DarkGray
& $phpCommand -d opcache.enable_cli=0 artisan wbox:bridge --sleep=2
