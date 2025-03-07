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
    icon: path.join(__dirname, 'favicon.ico')
  });

  // Lade die index.html der App
  const indexPath = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../index.html')}`;
  
  console.log('Lade Anwendung von:', indexPath);
  
  mainWindow.loadURL(indexPath);

  // Öffne die DevTools im Entwicklungsmodus
  if (isDev) {
    mainWindow.webContents.openDevTools();
  } else {
    // In der Produktionsversion auch DevTools öffnen, um Fehler zu sehen
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  // Starte den Backend-Server
  let serverPath;
  
  if (isDev) {
    serverPath = path.join(__dirname, '../server.js');
  } else {
    // In der Produktionsversion ist die server.js im Hauptverzeichnis
    serverPath = path.join(process.resourcesPath, 'app.asar', 'server.js');
    
    // Fallback, wenn der Pfad nicht existiert
    if (!fs.existsSync(serverPath)) {
      serverPath = path.join(app.getAppPath(), 'server.js');
    }
  }
  
  console.log('Server-Pfad:', serverPath);
  
  if (fs.existsSync(serverPath)) {
    console.log('Starte Server...');
    
    // Setze den Pfad für die Bilder
    process.env.IMAGES_PATH = isDev 
      ? path.join(__dirname, '../images') 
      : path.join(process.resourcesPath, 'images');
    
    console.log('Bilder-Pfad:', process.env.IMAGES_PATH);
    
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: process.env
    });
    
    serverProcess.on('error', (error) => {
      console.error('Server-Fehler:', error);
      dialog.showErrorBox('Server-Fehler', `Der Server konnte nicht gestartet werden: ${error.message}`);
    });
  } else {
    console.error('Server-Datei nicht gefunden:', serverPath);
    dialog.showErrorBox('Server-Fehler', `Die Server-Datei wurde nicht gefunden: ${serverPath}`);
  }
}

app.on('ready', () => {
  console.log('Electron-App wird gestartet...');
  console.log('Entwicklungsmodus:', isDev);
  console.log('App-Pfad:', app.getAppPath());
  
  if (!isDev) {
    console.log('Ressourcen-Pfad:', process.resourcesPath);
  }
  
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
    console.log('Beende Server-Prozess...');
    serverProcess.kill();
  }
}); 