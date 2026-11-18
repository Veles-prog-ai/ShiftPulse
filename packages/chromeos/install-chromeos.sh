#!/usr/bin/env bash
# ======================================================================
# ShiftPulse Ledger Pro - ChromeOS Linux Environment (Crostini) Installer
# Za Chromebook računare sa aktiviranim Linux razvojnim okruženjem
# ======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_DIR="${HOME}/.local/share/applications"

echo -e "\033[1;36m======================================================================\033[0m"
echo -e "\033[1;36m       ShiftPulse Ledger Pro - ChromeOS Crostini Installer            \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"
echo ""

# Provera Node.js u Crostini kontejneru
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;33m[INFO] Instaliram Node.js u ChromeOS Linux kontejner...\033[0m"
    sudo apt update
    sudo apt install -y nodejs npm xdg-utils
fi

echo -e "\033[1;32m[OK] Node.js u ChromeOS: $(node -v)\033[0m"

# Registracija ChromeOS Shelf prečice
mkdir -p "${DESKTOP_DIR}"
cat <<EOF > "${DESKTOP_DIR}/shiftpulse-chromeos.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=ShiftPulse Ledger Pro (ChromeOS)
Comment=Zero-Knowledge Accounting, Payroll & Tax Workstation
Exec=env NODE_ENV=production PORT=3000 SHIFTPULSE_LOCAL_DESKTOP=1 SHIFTPULSE_WORKSPACE_DIR=${HOME}/ShiftPulse_Workspace node "${SCRIPT_DIR}/server.js"
Icon=${SCRIPT_DIR}/public/icon.svg
Terminal=false
Categories=Office;Finance;
StartupNotify=true
EOF

chmod +x "${DESKTOP_DIR}/shiftpulse-chromeos.desktop"

# Kreiranje lokalnog radnog prostora u Crostini okruženju
WS_DIR="${HOME}/ShiftPulse_Workspace"
mkdir -p "${WS_DIR}/01_Ulaz_Dokumenta/Fakture_Racuni" \
         "${WS_DIR}/01_Ulaz_Dokumenta/Otpremnice" \
         "${WS_DIR}/01_Ulaz_Dokumenta/POS_Slipovi_Fiskalni" \
         "${WS_DIR}/01_Ulaz_Dokumenta/Bankarski_Izvodi" \
         "${WS_DIR}/01_Ulaz_Dokumenta/Obrada_Zavrseno" \
         "${WS_DIR}/02_Izlaz_Dokumenta/Bilansi_Porezi_CSV" \
         "${WS_DIR}/02_Izlaz_Dokumenta/Zarade_ePorezi_XML" \
         "${WS_DIR}/02_Izlaz_Dokumenta/Virmani_Nalozi" \
         "${WS_DIR}/02_Izlaz_Dokumenta/Arhiva_Ugovori" \
         "${WS_DIR}/03_Korisnicki_Backup"

echo ""
echo -e "\033[1;32m======================================================================\033[0m"
echo -e "\033[1;32m  ChromeOS instalacija je završena!                                   \033[0m"
echo -e "\033[1;32m  Radni folder: ${WS_DIR}                                             \033[0m"
echo -e "\033[1;32m  Prečica se sada nalazi u 'Linux apps' unutar ChromeOS Launcher-a.   \033[0m"
echo -e "\033[1;32m======================================================================\033[0m"
echo ""
echo "Pokrećem server..."
export NODE_ENV=production
export PORT=3000
export SHIFTPULSE_LOCAL_DESKTOP=1
export SHIFTPULSE_WORKSPACE_DIR="${WS_DIR}"
node "${SCRIPT_DIR}/server.js"
