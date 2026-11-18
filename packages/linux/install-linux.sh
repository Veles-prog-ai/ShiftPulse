#!/usr/bin/env bash
# ======================================================================
# ShiftPulse Ledger Pro - Linux Installer (Ubuntu / Debian / Fedora / Arch)
# Commercial B2B Workstation Bundle (v1.0 RS)
# ======================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="ShiftPulse Ledger Pro"
DESKTOP_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/scalable/apps"

echo -e "\033[1;36m======================================================================\033[0m"
echo -e "\033[1;36m     ShiftPulse Ledger Pro - Linux Workstation Installer (v1.0 RS)    \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"
echo ""

# 1. Provera Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "\033[1;33m[UPOZORENJE] Node.js nije instaliran!\033[0m"
    echo "Instalirajte Node.js pre pokretanja:"
    echo "  - Ubuntu/Debian: sudo apt update && sudo apt install -y nodejs npm"
    echo "  - Fedora: sudo dnf install -y nodejs npm"
    echo "  - Arch: sudo pacman -S nodejs npm"
    exit 1
fi

echo -e "\033[1;32m[1/4] Node.js verifikovan: $(node -v) (npm $(npm -v))\033[0m"

# 2. Dodeljivanje izvrsnih dozvola
echo -e "\033[1;34m[2/4] Podesavanje izvrsnih dozvola za skripte...\033[0m"
chmod +x "${SCRIPT_DIR}/start-linux.sh" || true

# 3. Instalacija ikone i .desktop precice
echo -e "\033[1;34m[3/4] Kreiranje XDG Desktop precice u ${DESKTOP_DIR}...\033[0m"
mkdir -p "${DESKTOP_DIR}"
mkdir -p "${ICON_DIR}"

# Kopiranje ikone ako postoji
if [ -f "${SCRIPT_DIR}/public/icon.svg" ]; then
    cp "${SCRIPT_DIR}/public/icon.svg" "${ICON_DIR}/shiftpulse-ledger.svg"
fi

# Generisanje prilagodjenog .desktop fajla sa apsolutnim putanjama
cat <<EOF > "${DESKTOP_DIR}/shiftpulse-ledger.desktop"
[Desktop Entry]
Version=1.0
Type=Application
Name=${APP_NAME}
Comment=B2B Knjigovodstvo, Smenski Rad i ePorezi PPP-PD Obračun
Exec="${SCRIPT_DIR}/start-linux.sh"
Icon=${ICON_DIR}/shiftpulse-ledger.svg
Terminal=true
Categories=Office;Finance;Business;Utility;
StartupNotify=true
EOF

chmod +x "${DESKTOP_DIR}/shiftpulse-ledger.desktop"

# 4. Instalacija zavisnosti ako package.json postoji
if [ -f "${SCRIPT_DIR}/package.json" ]; then
    echo -e "\033[1;34m[4/5] Instalacija produkcionih paketa...\033[0m"
    cd "${SCRIPT_DIR}"
    npm install --omit=dev --no-audit || true
fi

# 5. Kreiranje organizovanog radnog prostora za offline rad
WS_DIR="${HOME}/ShiftPulse_Workspace"
echo -e "\033[1;34m[5/5] Kreiranje lokalnog radnog prostora u ${WS_DIR}...\033[0m"
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
echo -e "\033[1;32m  Instalacija za Linux je uspesno zavrsena!                           \033[0m"
echo -e "\033[1;32m  Radni folder: ${WS_DIR}                                             \033[0m"
echo -e "\033[1;32m  Precica je dodata u vas sistemski meni (GNOME / KDE / XFCE).        \033[0m"
echo -e "\033[1;32m======================================================================\033[0m"
echo ""

read -p "Zelite li odmah da pokrenete ShiftPulse Ledger Pro? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    exec "${SCRIPT_DIR}/start-linux.sh"
fi
