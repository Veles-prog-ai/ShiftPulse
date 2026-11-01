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
Comment=B2B Knjigovodstvo i Smenski Rad
Exec=node "${SCRIPT_DIR}/server.js"
Icon=${SCRIPT_DIR}/public/icon.svg
Terminal=false
Categories=Office;Finance;
StartupNotify=true
EOF

chmod +x "${DESKTOP_DIR}/shiftpulse-chromeos.desktop"

echo ""
echo -e "\033[1;32m======================================================================\033[0m"
echo -e "\033[1;32m  ChromeOS instalacija je završena!                                   \033[0m"
echo -e "\033[1;32m  Prečica se sada nalazi u 'Linux apps' unutar ChromeOS Launcher-a.   \033[0m"
echo -e "\033[1;32m======================================================================\033[0m"
echo ""
echo "Pokrećem server..."
node "${SCRIPT_DIR}/server.js"
