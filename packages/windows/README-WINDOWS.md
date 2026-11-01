# ShiftPulse Ledger Pro — Windows Instalacioni Paket (Live Testing)

Ovaj paket je pripremljen za testiranje uživo na operativnom sistemu **Windows 10, Windows 11 i Windows Server**.

## Sadržaj paketa:
- `install-windows.bat`: Automatski instalater (proverava Node.js, konfiguriše zavisnosti, kreira prečicu na radnoj površini)
- `start-windows.bat`: Brzi pokretač (jedan klik pokreće lokalni server i otvara aplikaciju u podrazumevanom pretraživaču)
- `run-windows.ps1`: Skripta za korisnike PowerShell-a
- `package-windows.json`: Specifikacija za kreiranje samostalnog `.exe` instalera preko Electron-a

## Uputstvo za pokretanje:
1. Raspakujte zip arhivu na željenu lokaciju (npr. `C:\ShiftPulse`).
2. Dvaput kliknite na **`install-windows.bat`**.
3. Aplikacija će se automatski otvoriti na adresi `http://localhost:3000` u punom radnom režimu sa svim funkcijama (obračun zarada, ePorezi XML, bolovanja, odmori, kalendar smena).
4. Nakon prve instalacije, aplikaciju možete uvek pokrenuti preko prečice sa radne površine (**Desktop**) ili dvoklikom na `start-windows.bat`.
