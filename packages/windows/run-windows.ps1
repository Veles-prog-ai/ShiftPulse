# ShiftPulse Ledger - Windows PowerShell Commercial Workstation Runner
# Run via Right-click -> Run with PowerShell or .\run-windows.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   ShiftPulse Ledger - Commercial Workstation Runner  " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 1. Verify Node.js runtime
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Warning "Node.js not found! Attempting automated install via winget..."
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Error "Please install Node.js LTS from https://nodejs.org and re-run this launcher."
        Pause
        exit 1
    }
}

Write-Host "Node.js runtime verified: " -NoNewline -ForegroundColor Green
node -v

# 2. Launch default browser after server binds
$job = Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3000"
}

# 3. Start Local Desktop Gateway
$env:NODE_ENV = "production"
$env:PORT = "3000"
$env:SHIFTPULSE_LOCAL_DESKTOP = "1"
$env:SHIFTPULSE_WORKSPACE_DIR = "$env:USERPROFILE\Documents\ShiftPulse_Workspace"
Write-Host "Starting ShiftPulse Ledger at http://localhost:3000 ..." -ForegroundColor Yellow
if (Test-Path "server.js") {
    node server.js
} else {
    npm run dev
}
