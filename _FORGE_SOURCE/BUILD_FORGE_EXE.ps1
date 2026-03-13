# FORGE production build helper (Windows)
# Produces installer/exe artifacts via Tauri.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " FORGE Production Build" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

function Require-Command {
    param([string]$Name, [string]$InstallHint)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: Missing required command '$Name'" -ForegroundColor Red
        Write-Host $InstallHint -ForegroundColor Yellow
        exit 1
    }
}

Require-Command "npm" "Install Node.js LTS from https://nodejs.org"
Require-Command "cargo" "Install Rust from https://rustup.rs"

if (-not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: MSVC linker (link.exe) not found." -ForegroundColor Red
    Write-Host "Install 'Build Tools for Visual Studio 2022' with:" -ForegroundColor Yellow
    Write-Host " - Desktop development with C++" -ForegroundColor Yellow
    Write-Host " - MSVC v143 toolset" -ForegroundColor Yellow
    Write-Host " - Windows 10/11 SDK" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then reopen PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/3] Installing JS deps..." -ForegroundColor White
npm install

Write-Host "[2/3] Building web frontend..." -ForegroundColor White
npm run build

Write-Host "[3/3] Building Tauri bundles..." -ForegroundColor White
npm run tauri:build

$bundleDir = Join-Path $PSScriptRoot "src-tauri\target\release\bundle"
Write-Host ""
Write-Host "Build complete. Artifacts:" -ForegroundColor Green
Write-Host $bundleDir -ForegroundColor Green
