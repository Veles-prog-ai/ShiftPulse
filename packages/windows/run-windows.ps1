# ShiftPulse Ledger Pro - PowerShell Live Test Runner
# Za pokretanje: Right-click -> Run with PowerShell ili .\run-windows.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ShiftPulse Ledger Pro - Windows PowerShell Live Runner" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Provera Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Node.js nije pronadjen! Instaliram preko winget-a..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Molimo instalirajte Node.js sa https://nodejs.org i pokrenite ponovo."
        Pause
        exit 1
    }
}

Write-Host "Node.js verzija: " -NoNewline -ForegroundColor Green
node -v

# 2. Otvaranje browsera nakon starta
$job = Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
}

# 3. Pokretanje servera
Write-Host "Pokrecem ShiftPulse Ledger Pro na http://localhost:3000..." -ForegroundColor Yellow
if (Test-Path "server.js") {
    node server.js
} else {
    npm run dev
}
