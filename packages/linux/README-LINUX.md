# ShiftPulse Ledger Pro — Linux Instalacioni Paket (Live Testing)

Ovaj paket je pripremljen za testiranje uživo na svim popularnim **Linux distribucijama (Ubuntu, Debian, Fedora, Arch Linux, Manjaro, openSUSE)**.

## Sadržaj paketa:
- `install-linux.sh`: Skripta za instalaciju (dodaje `.desktop` prečicu u GNOME/KDE meni aplikacija i podešava prava)
- `start-linux.sh`: Brzo pokretanje (pokreće server i otvara `http://localhost:3000` u podrazumevanom pretraživaču preko `xdg-open`)
- `shiftpulse-ledger.desktop`: XDG FreeDesktop specifikacija za integraciju u Linux radno okruženje
- `package-linux.json`: Specifikacija za kreiranje `.AppImage` i `.deb` paketa

## Uputstvo za pokretanje:
1. Otvorite terminal u raspakovanom direktorijumu:
   ```bash
   chmod +x install-linux.sh start-linux.sh
   ./install-linux.sh
   ```
2. Skripta automatski registruje aplikaciju u vašem meniju.
3. Aplikaciju možete pokrenuti u svakom trenutku kucanjem:
   ```bash
   ./start-linux.sh
   ```
   ili pretragom "ShiftPulse Ledger Pro" unutar sistemskog menija (Super key / Start).
