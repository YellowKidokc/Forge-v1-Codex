# ═══════════════════════════════════════════════════════════════
# FORGE: Logos Workshop - PowerShell Launcher
# ═══════════════════════════════════════════════════════════════

$Host.UI.RawUI.WindowTitle = "FORGE: Logos Workshop"
Write-Host ""
Write-Host "═════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  FORGE: Logos Workshop" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] " -NoNewline -ForegroundColor Gray
Write-Host "Checking Node.js..." -ForegroundColor White

if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: " -NoNewline -ForegroundColor Red
    Write-Host "npm not found. Install Node.js from https://nodejs.org" -ForegroundColor Yellow
    pause
    exit 1
}

$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "    ✓ Node.js $nodeVersion | npm $npmVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] " -NoNewline -ForegroundColor Gray
Write-Host "Checking Rust toolchain..." -ForegroundColor White

if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: " -NoNewline -ForegroundColor Red
    Write-Host "Rust not found. Install from https://rustup.rs" -ForegroundColor Yellow
    pause
    exit 1
}

$rustVersion = rustc --version
Write-Host "    ✓ $rustVersion" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] " -NoNewline -ForegroundColor Gray
Write-Host "Launching FORGE..." -ForegroundColor White
Write-Host ""
Write-Host "─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "Database: Will try lowes/david/postgres@192.168.1.177:2665" -ForegroundColor DarkGray
Write-Host "Status dots: Red=failed, Yellow=connecting, Green=connected" -ForegroundColor DarkGray
Write-Host "─────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# Launch Tauri in dev mode
npm run tauri dev

Write-Host ""
Write-Host "FORGE closed." -ForegroundColor Yellow
pause
