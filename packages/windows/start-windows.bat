@echo off
title ShiftPulse Ledger Pro - Pokretanje
color 0a

set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo ======================================================================
echo          ShiftPulse Ledger Pro - Desktop Workstation (Windows)
echo ======================================================================
echo.
echo [INFO] Pokrecem lokalni server na portu 3000...
echo [INFO] Mozete zatvoriti ovaj prozor kada zavrsite sa radom (Ctrl+C).
echo.

:: Pokretanje browsera sa malom pauzom da se server podigne
start "" "http://localhost:3000"

:: Pokretanje server.js
if exist "server.js" (
    node server.js
) else (
    npm run dev
)

pause
