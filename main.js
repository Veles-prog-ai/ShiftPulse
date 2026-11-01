// main.js - Electron Desktop Launcher za ShiftPulse Ledger Pro
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow = null;
let serverProcess = null;

function startBackendServer() {
  try {
    // Pokrećemo server.js ili server.ts kao lokalni background proces
    const serverScript = path.join(__dirname, 'server.js');
    serverProcess = spawn('node', [serverScript], {
      env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('Greška pri pokretanju pozadinskog servera:', err);
    });
  } catch (err) {
    console.error('Neuspešno pokretanje internog servera:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'ShiftPulse Ledger Pro - B2B SaaS',
    icon: path.join(__dirname, 'public/icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: false
  });

  // Učitavamo lokalni server stanice
  const targetUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(targetUrl);

  // Otvaranje eksternih linkova u sistemskom browseru
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Pokreni interni server ako nije aktivan eksterni URL
  if (!process.env.ELECTRON_START_URL) {
    startBackendServer();
  }

  // Kratka pauza za inicijalizaciju porta
  setTimeout(createWindow, 1200);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});
