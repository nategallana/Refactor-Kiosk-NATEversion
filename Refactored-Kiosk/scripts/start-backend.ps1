$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$databasePath = Join-Path $backendRoot 'database\database.sqlite'
if (-not (Test-Path -LiteralPath $databasePath)) {
    New-Item -ItemType File -Path $databasePath -Force | Out-Null
}
$publicRoot = Join-Path $backendRoot 'public'
$router = Join-Path $backendRoot 'vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php'
$phpCommand = (Get-Command php -ErrorAction SilentlyContinue).Source

if (-not $phpCommand) {
    $phpCommand = Join-Path $env:USERPROFILE '.config\herd\bin\php.bat'
}
if (-not (Test-Path -LiteralPath $phpCommand)) {
    throw 'PHP was not found. Start Laravel Herd or add PHP to your PATH.'
}

$envPath = Join-Path $backendRoot '.env'
$envExamplePath = Join-Path $backendRoot '.env.example'
if (-not (Test-Path -LiteralPath $envPath) -and (Test-Path -LiteralPath $envExamplePath)) {
    Copy-Item -LiteralPath $envExamplePath -Destination $envPath
}

$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $databasePath
$env:SESSION_DRIVER = 'file'
$env:CACHE_STORE = 'file'
$env:QUEUE_CONNECTION = 'sync'

Set-Location -LiteralPath $backendRoot
if (-not (Select-String -Path $envPath -Pattern '^APP_KEY=base64:' -Quiet -ErrorAction SilentlyContinue)) {
    & $phpCommand -d opcache.enable_cli=0 artisan key:generate --force
}
& $phpCommand -d opcache.enable_cli=0 artisan config:clear
& $phpCommand -d opcache.enable_cli=0 artisan migrate --force
& $phpCommand -d opcache.enable_cli=0 artisan db:seed --force
Write-Host 'Laravel API running at http://0.0.0.0:8000' -ForegroundColor Green
Set-Location -LiteralPath $publicRoot
& $phpCommand -d opcache.enable_cli=0 -d opcache.jit=0 -S 0.0.0.0:8000 $router
