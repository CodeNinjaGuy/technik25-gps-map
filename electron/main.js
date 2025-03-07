const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;

function createWindow() {
  // Erstelle das Browser-Fenster
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  // Lade die index.html der App
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Öffne die DevTools im Entwicklungsmodus
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  // Starte den Backend-Server
  const serverPath = path.join(__dirname, '../server.js');
  
  if (fs.existsSync(serverPath)) {
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit'
    });
    
    serverProcess.on('error', (error) => {
      dialog.showErrorBox('Server-Fehler', `Der Server konnte nicht gestartet werden: ${error.message}`);
    });
  } else {
    dialog.showErrorBox('Server-Fehler', 'Die Server-Datei wurde nicht gefunden.');
  }
}

app.on('ready', () => {
  startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // Beende den Server-Prozess, wenn die App geschlossen wird
  if (serverProcess) {
    serverProcess.kill();
  }
}); 