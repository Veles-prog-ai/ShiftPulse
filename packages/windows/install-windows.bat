@echo off
title ShiftPulse Ledger Pro - Commercial Workstation Installer (v1.0 RS)
color 0b
echo ======================================================================
echo       ShiftPulse Ledger Pro - Commercial B2B Workstation Setup
echo            Republic of Serbia v1.0 Edition (Windows 10/11)
echo ======================================================================
echo.

:: 1. Provera Node.js instalacije
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [UPOZORENJE] Node.js nije pronadjen na vasem sistemu!
    echo Preuzmite i instalirajte Node.js (LTS verziju):
    echo https://nodejs.org/
    echo.
    echo Pokusavam automatsku instalaciju preko winget-a...
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo Automatska instalacija nije uspela. Molimo instalirajte Node.js rucno i pokrenite ovu skriptu ponovo.
        pause
        exit /b 1
    )
)

echo [1/3] Node.js okruzenje verifikovano:
node -v
npm -v
echo.

:: 2. Instalacija zavisnosti
echo [2/3] Priprema biblioteka i baza...
if exist package.json (
    call npm install --omit=dev --no-audit
) else (
    echo [INFO] Koristi se samostalni live runtime bundle.
)
echo.

:: 3. Kreiranje organizovanih foldera za offline rad (ShiftPulse_Workspace)
echo [3/4] Kreiranje radnih foldera za dokumentaciju...
set WS_DIR=%USERPROFILE%\Documents\ShiftPulse_Workspace
mkdir "%WS_DIR%\01_Ulaz_Dokumenta\Fakture_Racuni" 2>nul
mkdir "%WS_DIR%\01_Ulaz_Dokumenta\Otpremnice" 2>nul
mkdir "%WS_DIR%\01_Ulaz_Dokumenta\POS_Slipovi_Fiskalni" 2>nul
mkdir "%WS_DIR%\01_Ulaz_Dokumenta\Bankarski_Izvodi" 2>nul
mkdir "%WS_DIR%\01_Ulaz_Dokumenta\Obrada_Zavrseno" 2>nul
mkdir "%WS_DIR%\02_Izlaz_Dokumenta\Bilansi_Porezi_CSV" 2>nul
mkdir "%WS_DIR%\02_Izlaz_Dokumenta\Zarade_ePorezi_XML" 2>nul
mkdir "%WS_DIR%\02_Izlaz_Dokumenta\Virmani_Nalozi" 2>nul
mkdir "%WS_DIR%\02_Izlaz_Dokumenta\Arhiva_Ugovori" 2>nul
mkdir "%WS_DIR%\03_Korisnicki_Backup" 2>nul
echo ShiftPulse Workspace: %WS_DIR%

:: 4. Kreiranje precice na radnoj povrsini (Desktop Shortcut)
echo [4/4] Kreiranje precice za radnu povrsinu...
set SCRIPT_DIR=%~dp0
set TARGET_SCRIPT=%SCRIPT_DIR%start-windows.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\ShiftPulse Ledger Pro.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_SCRIPT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.IconLocation = '%SCRIPT_DIR%public\icon.svg'; $s.Description = 'ShiftPulse Ledger Pro - Knjigovodstvo i Smenski Rad'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [USPEH] Precica je uspesno kreirana na vasem Desktopu!
)

echo.
echo ======================================================================
echo   Instalacija je uspesno zavrsena!
echo   Radni folder: %WS_DIR%
echo   Pokrecem aplikaciju...
echo ======================================================================
echo.

call "%SCRIPT_DIR%start-windows.bat"
