@echo off
title ShiftPulse Ledger - Pokretanje
color 0a

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo ======================================================================
echo          ShiftPulse Ledger - Desktop Workstation (Windows)
echo ======================================================================
echo.
echo [INFO] Pokrecem lokalni server na portu 3000...
echo [INFO] Mozete zatvoriti ovaj prozor kada zavrsite sa radom (Ctrl+C).
echo.

:: Podesavanje okruzenja za produkciju, port i lokalni radni prostor
set NODE_ENV=production
set PORT=3000
set SHIFTPULSE_LOCAL_DESKTOP=1
set SHIFTPULSE_WORKSPACE_DIR=%USERPROFILE%\Documents\ShiftPulse_Workspace

:: Pokretanje browsera sa malom pauzom da se server podigne
start "" "http://localhost:3000"

:: Pokretanje server.js
if exist "server.js" (
    node server.js
) else (
    npm run dev
)

pause
