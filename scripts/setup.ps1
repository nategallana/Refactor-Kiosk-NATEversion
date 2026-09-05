$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'backend'
$databasePath = Join-Path $backendRoot 'database\database.sqlite'

Write-Host "=== Setting up Kiosk Project ===" -ForegroundColor Cyan

# 1. Check tools
$phpCommand = (Get-Command php -ErrorAction SilentlyContinue).Source
if (-not $phpCommand) {
    $phpCommand = Join-Path $env:USERPROFILE '.config\herd\bin\php.bat'
}
if (-not (Test-Path -LiteralPath $phpCommand)) {
    throw 'PHP was not found. Please install PHP or start Laravel Herd.'
}

# 2. Setup backend .env
$backendEnv = Join-Path $backendRoot '.env'
$backendEnvExample = Join-Path $backendRoot '.env.example'
if (-not (Test-Path -LiteralPath $backendEnv) -and (Test-Path -LiteralPath $backendEnvExample)) {
    Copy-Item $backendEnvExample $backendEnv
    Write-Host "Created backend/.env from .env.example" -ForegroundColor Green
}

# 3. Setup root frontend .env
$frontendEnv = Join-Path $projectRoot '.env'
$frontendEnvExample = Join-Path $projectRoot '.env.example'
if (-not (Test-Path -LiteralPath $frontendEnv) -and (Test-Path -LiteralPath $frontendEnvExample)) {
    Copy-Item $frontendEnvExample $frontendEnv
    Write-Host "Created root .env from .env.example" -ForegroundColor Green
}

# 4. Backend dependencies
Write-Host "Installing backend composer dependencies..." -ForegroundColor Yellow
Set-Location -LiteralPath $backendRoot
composer install

# 5. SQLite Database and Migration
if (-not (Test-Path -LiteralPath $databasePath)) {
    New-Item -ItemType File -Path $databasePath -Force | Out-Null
    Write-Host "Created database.sqlite" -ForegroundColor Green
}

$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $databasePath
& $phpCommand artisan key:generate --force
& $phpCommand artisan migrate --seed --force
Write-Host "Database migrated and seeded successfully." -ForegroundColor Green

# 6. Frontend dependencies
Write-Host "Installing frontend npm packages..." -ForegroundColor Yellow
Set-Location -LiteralPath $projectRoot
npm install

Write-Host "`n=== Setup Complete! ===" -ForegroundColor Green
Write-Host "To run the project:"
Write-Host "1. Frontend: .\scripts\start-frontend.ps1  (http://127.0.0.1:4173)" -ForegroundColor Cyan
Write-Host "2. Backend:  .\scripts\start-backend.ps1   (http://127.0.0.1:8000)" -ForegroundColor Cyan
