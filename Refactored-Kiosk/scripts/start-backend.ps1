$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$databasePath = Join-Path $backendRoot 'database\database.sqlite'
$publicRoot = Join-Path $backendRoot 'public'
$router = Join-Path $backendRoot 'vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php'
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
& $phpCommand -d opcache.enable_cli=0 artisan config:clear
& $phpCommand -d opcache.enable_cli=0 artisan migrate --seed --force
Write-Host 'Laravel API running at http://0.0.0.0:8000' -ForegroundColor Green
Set-Location -LiteralPath $publicRoot
& $phpCommand -d opcache.enable_cli=0 -d opcache.jit=0 -S 0.0.0.0:8000 $router
