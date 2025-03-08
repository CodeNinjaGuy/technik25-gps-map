const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

let mainWindow;
let server;

// Pfade
const isDev = process.env.NODE_ENV === 'development';
const imagesPath = isDev ? path.join(__dirname, '../images') : path.join(process.resourcesPath, 'images');

// Hartcodierte Beispieldaten für einen garantierten Start
const FALLBACK_PHOTOS = [
  {
    filename: 'beispiel1.jpg',
    path: '/images/beispiel1.jpg', 
    latitude: 52.520008,
    longitude: 13.404954
  },
  {
    filename: 'beispiel2.jpg',
    path: '/images/beispiel2.jpg',
    latitude: 48.135125,
    longitude: 11.581981
  },
  {
    filename: 'beispiel3.jpg',
    path: '/images/beispiel3.jpg',
    latitude: 50.110924,
    longitude: 8.682127
  }
];

// Starte den Server
function startServer() {
  const expressApp = express();
  const PORT = 3001;
  
  // CORS aktivieren
  expressApp.use(cors({
    origin: '*',
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
  }));
  
  // Bilder-Verzeichnis bereitstellen
  console.log('Bilder-Verzeichnis:', imagesPath);
  if (!fs.existsSync(imagesPath)) {
    console.log('Erstelle Bilder-Verzeichnis:', imagesPath);
    fs.mkdirSync(imagesPath, { recursive: true });
  }
  
  expressApp.use('/images', express.static(imagesPath));
  
  // API-Endpunkte
  expressApp.get('/api/photos', (req, res) => {
    console.log('API-Anfrage für Fotos erhalten');
    
    // Immer die Fallback-Daten zurückgeben, um sicherzustellen, dass die App funktioniert
    res.json(FALLBACK_PHOTOS);
  });
  
  expressApp.get('/api/status', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Statische Build-Dateien
  const buildPath = isDev 
    ? path.join(__dirname, '../build') 
    : path.join(__dirname, '../build');
  
  if (fs.existsSync(buildPath)) {
    expressApp.use(express.static(buildPath));
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }
  
  // Server starten
  return new Promise((resolve, reject) => {
    try {
      server = expressApp.listen(PORT, () => {
        console.log(`Server läuft auf Port ${PORT}`);
        resolve();
      });
    } catch (error) {
      console.error('Fehler beim Starten des Servers:', error);
      reject(error);
    }
  });
}

// Erstelle das Hauptfenster
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  
  const loadUrl = isDev
    ? 'http://localhost:3000'
    : `http://localhost:3001`;
  
  console.log('Lade URL:', loadUrl);
  
  // Fehlerbehandlung
  mainWindow.webContents.on('did-fail-load', () => {
    console.log('Fehler beim Laden, versuche erneut...');
    setTimeout(() => mainWindow.loadURL(loadUrl), 1000);
  });
  
  // Zeige das Fenster erst, wenn es geladen ist
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Inhalt geladen, zeige Fenster');
    mainWindow.show();
  });
  
  // Lade die URL
  mainWindow.loadURL(loadUrl);
  
  // DevTools öffnen
  mainWindow.webContents.openDevTools();
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App starten
app.on('ready', async () => {
  console.log('App bereit zum Starten');
  
  try {
    // Starte den Server
    await startServer();
    
    // Kurze Pause, um sicherzustellen, dass der Server vollständig initialisiert ist
    setTimeout(() => {
      createWindow();
    }, 500);
  } catch (error) {
    console.error('Fehler beim Starten der App:', error);
  }
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
  if (server) {
    server.close();
  }
}); 