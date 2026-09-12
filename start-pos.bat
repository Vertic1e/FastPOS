@echo off
title FastPOS Standalone
echo ========================================================
echo   FastPOS Standalone - 100%% Offline Local POS Engine
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/2] Checking standalone build...
if not exist ".next\standalone\server.js" (
    echo Building standalone production bundle...
    call npm run build
    xcopy /e /i /y public .next\standalone\public >nul 2>&1
    xcopy /e /i /y .next\static .next\standalone\.next\static >nul 2>&1
)

echo [2/2] Launching FastPOS engine...
start /b "" node scripts/start-standalone.js

echo Waiting for FastPOS to be ready...
timeout /t 3 /nobreak >nul

start "" "http://localhost:3000/pos"
echo.
echo ========================================================
echo   FastPOS is running locally at http://localhost:3000/pos
echo ========================================================
echo.
pause
