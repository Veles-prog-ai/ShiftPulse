#!/usr/bin/env bash
# ShiftPulse Ledger - Linux Start Launcher

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

echo -e "\033[1;36m======================================================================\033[0m"
echo -e "\033[1;36m       ShiftPulse Ledger - Pokretanje na Linux sistemu            \033[0m"
echo -e "\033[1;36m======================================================================\033[0m"
echo ""
echo -e "\033[1;33m[INFO] Pokrecem lokalni server na http://localhost:3000...\033[0m"
echo "Pritisnite Ctrl+C za zaustavljanje."
echo ""

# Otvori web browser u pozadini nakon 1.5 sekunde
(
  sleep 1.5
  if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "http://localhost:3000" >/dev/null 2>&1 || true
  elif command -v sensible-browser >/dev/null 2>&1; then
      sensible-browser "http://localhost:3000" >/dev/null 2>&1 || true
  fi
) &

export NODE_ENV=production
export PORT=3000
export SHIFTPULSE_LOCAL_DESKTOP=1
export SHIFTPULSE_WORKSPACE_DIR="${HOME}/ShiftPulse_Workspace"

if [ -f "server.js" ]; then
    exec node server.js
else
    exec npm run dev
fi
