const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

let mainWindow;
let server;
let selectedImagesPath = null;

// Pfade
const isDev = process.env.NODE_ENV === 'development';
const defaultImagesPath = isDev ? path.join(__dirname, '../images') : path.join(process.resourcesPath, 'images');

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
  
  // Standardpfad für Bilder setzen
  let imagesPath = selectedImagesPath || defaultImagesPath;
  
  // Verzeichnis-Info bereitstellen
  expressApp.get('/api/directory-info', (req, res) => {
    res.json({
      currentPath: imagesPath,
      isDefault: imagesPath === defaultImagesPath
    });
  });
  
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
    
    try {
      // Aktualisiere den Bilder-Pfad (falls geändert)
      imagesPath = selectedImagesPath || defaultImagesPath;
      
      // Lese alle Dateien im Bilder-Verzeichnis
      if (!fs.existsSync(imagesPath)) {
        console.log('Bilder-Verzeichnis existiert nicht:', imagesPath);
        return res.json(FALLBACK_PHOTOS);
      }
      
      const files = fs.readdirSync(imagesPath);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      });
      
      console.log(`${imageFiles.length} Bilddateien gefunden`);
      
      if (imageFiles.length === 0) {
        console.log('Keine Bilddateien gefunden. Sende leere Liste.');
        return res.json(FALLBACK_PHOTOS);
      }
      
      // Erstelle Foto-Objekte mit Basisdaten (ohne GPS-Extraktion)
      const photos = imageFiles.map((filename) => {
        return {
          filename: filename,
          path: `/images/${filename}`,
          // Zufällige Koordinaten in Deutschland für Demo-Zwecke
          latitude: 51.1657 + (Math.random() - 0.5) * 2,
          longitude: 10.4515 + (Math.random() - 0.5) * 4
        };
      });
      
      res.json(photos);
    } catch (err) {
      console.error('Fehler beim Verarbeiten der Anfrage:', err);
      res.json(FALLBACK_PHOTOS);
    }
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

// Dialog zum Auswählen des Bildordners
function showFolderSelectDialog() {
  if (!mainWindow) return;
  
  dialog.showOpenDialog(mainWindow, {
    title: 'Bilder-Ordner auswählen',
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      selectedImagesPath = result.filePaths[0];
      console.log('Neuer Bilder-Pfad ausgewählt:', selectedImagesPath);
      
      // Informiere das Frontend über den neuen Pfad
      mainWindow.webContents.send('directory-changed', {
        path: selectedImagesPath,
        isDefault: false
      });
    }
  }).catch(err => {
    console.error('Fehler bei der Ordnerauswahl:', err);
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
  
  // Füge Menü hinzu
  const { Menu } = require('electron');
  const template = [
    {
      label: 'Datei',
      submenu: [
        {
          label: 'Bilder-Ordner öffnen...',
          click: showFolderSelectDialog
        },
        { type: 'separator' },
        {
          label: 'Beenden',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC-Kommunikation für die Ordnerauswahl
ipcMain.on('select-directory', () => {
  showFolderSelectDialog();
});

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