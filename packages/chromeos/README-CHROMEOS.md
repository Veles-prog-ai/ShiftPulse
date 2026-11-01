# ShiftPulse Ledger Pro — ChromeOS Instalacioni Paket (Live Testing)

Ovaj paket je optimizovan za **Chromebook uređaje i ChromeOS operativni sistem**.

Nudi **dve metode testiranja**:

### Metoda 1: 1-Klik Native ChromeOS PWA instalacija (Preporučeno)
1. Otvorite aplikaciju u Chrome pretraživaču na Chromebook-u.
2. U adresnoj traci (desno) kliknite na ikonicu **"Instaliraj ShiftPulse Ledger Pro"** ili u meniju aplikacije izaberite **"Instaliraj aplikaciju"**.
3. Aplikacija se automatski zaključava na ChromeOS policu (**Shelf**) kao prvoklasna aplikacija.
4. Podržava rad bez internet veze (offline keširanje putem Service Worker-a) i rad u zasebnom prozoru bez trake pretraživača.

### Metoda 2: ChromeOS Linux kontejner (Crostini)
Ako želite da pokrenete i ceo lokalni Node.js server direktno unutar Chromebook Linux okruženja:
1. Uključite Linux na Chromebook-u: *Settings -> Developers -> Linux development environment -> Turn on*.
2. Otvorite Linux terminal i pređite u ovaj direktorijum:
   ```bash
   chmod +x install-chromeos.sh
   ./install-chromeos.sh
   ```
3. Skripta instalira prečicu u ChromeOS Launcher pod nazivom **"ShiftPulse Ledger Pro (ChromeOS)"**.
