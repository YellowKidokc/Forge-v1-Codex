@echo off
REM ========================================
REM FORGE: Logos Workshop Launcher
REM ========================================

echo.
echo  ═════════════════════════════════════
echo   FORGE: Logos Workshop
echo  ═════════════════════════════════════
echo.

cd /d "%~dp0"

echo [1/3] Checking dependencies...
where npm >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm not found. Install Node.js first.
    pause
    exit /b 1
)

echo [2/3] Building Tauri app...
call npm run tauri dev

echo.
echo FORGE launched successfully!
pause
