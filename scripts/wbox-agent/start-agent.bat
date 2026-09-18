@echo off
title WBOX In-Store Sync Agent
cd /d "%~dp0"

echo ========================================================
echo        Starting WBOX In-Store Sync Agent...
echo ========================================================
echo.

node agent.mjs
if %ERRORLEVEL% neq 0 (
    echo.
    echo Agent exited with error code %ERRORLEVEL%.
    pause
)
