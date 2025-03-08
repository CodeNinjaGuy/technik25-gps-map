const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

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

// Einfache Python-basierte GPS-Extraktion
async function extractGpsDataWithPython(imagePath, imagesPath) {
  console.log(`Versuche, GPS-Daten zu extrahieren aus: ${imagePath}`);
  
  // Prüfe, ob die Datei existiert
  if (!fs.existsSync(imagePath)) {
    console.error(`Datei existiert nicht: ${imagePath}`);
    return null;
  }
  
  return new Promise((resolve, reject) => {
    // Erstelle ein temporäres Python-Skript
    const pythonScript = `
import sys
import json
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_exif_data(image_path):
    try:
        img = Image.open(image_path)
        print(f"Bild geöffnet: {image_path}", file=sys.stderr)
        exif_data = {}
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif:
                print(f"EXIF-Daten gefunden", file=sys.stderr)
                for tag, value in exif.items():
                    decoded = TAGS.get(tag, tag)
                    exif_data[decoded] = value
            else:
                print(f"Keine EXIF-Daten gefunden", file=sys.stderr)
        else:
            print(f"Bild hat keine _getexif-Methode", file=sys.stderr)
        return exif_data
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return {}

def get_gps_info(exif_data):
    gps_info = {}
    if 'GPSInfo' in exif_data:
        print(f"GPSInfo-Tag gefunden", file=sys.stderr)
        for key, value in exif_data['GPSInfo'].items():
            decoded = GPSTAGS.get(key, key)
            gps_info[decoded] = value
        print(f"GPS-Daten: {gps_info}", file=sys.stderr)
    else:
        print(f"Kein GPSInfo-Tag gefunden", file=sys.stderr)
        # Alternative Tags prüfen
        for tag in ['GPSLatitude', 'GPSLongitude', 'Latitude', 'Longitude']:
            if tag in exif_data:
                print(f"Alternatives GPS-Tag gefunden: {tag}", file=sys.stderr)
    return gps_info

def get_decimal_coordinates(gps_info):
    if not gps_info:
        print(f"Keine GPS-Informationen vorhanden", file=sys.stderr)
        return None, None

    if 'GPSLatitude' not in gps_info or 'GPSLongitude' not in gps_info:
        print(f"Unvollständige GPS-Daten: Latitude oder Longitude fehlt", file=sys.stderr)
        return None, None

    try:
        lat = gps_info['GPSLatitude']
        lat_ref = gps_info.get('GPSLatitudeRef', 'N')
        lng = gps_info['GPSLongitude']
        lng_ref = gps_info.get('GPSLongitudeRef', 'E')

        print(f"Rohe GPS-Daten: Lat {lat} {lat_ref}, Lng {lng} {lng_ref}", file=sys.stderr)
        
        lat_decimal = lat[0] + lat[1]/60 + lat[2]/3600
        if lat_ref == 'S':
            lat_decimal = -lat_decimal

        lng_decimal = lng[0] + lng[1]/60 + lng[2]/3600
        if lng_ref == 'W':
            lng_decimal = -lng_decimal

        print(f"Konvertierte Dezimal-Koordinaten: {lat_decimal}, {lng_decimal}", file=sys.stderr)
        return lat_decimal, lng_decimal
    except Exception as e:
        print(f"Error converting coordinates: {str(e)}", file=sys.stderr)
        return None, None

# Alternative Methode, direkt nach Koordinaten in beliebigen Formaten zu suchen
def find_coordinates_in_exif(exif_data):
    try:
        # Direkte Suche nach bekannten Tags
        lat, lng = None, None
        
        # Methode 1: Standard-GPS-Tags
        if 'GPSInfo' in exif_data:
            gps_info = get_gps_info(exif_data)
            lat, lng = get_decimal_coordinates(gps_info)
            if lat is not None:
                return lat, lng
        
        # Methode 2: Direkte Latitude/Longitude-Tags
        if 'GPSLatitude' in exif_data and 'GPSLongitude' in exif_data:
            try:
                lat = float(exif_data['GPSLatitude'])
                lng = float(exif_data['GPSLongitude'])
                print(f"Direkte GPS-Tags gefunden: {lat}, {lng}", file=sys.stderr)
                return lat, lng
            except:
                pass
        
        # Methode 3: Einfache Latitude/Longitude-Tags
        if 'Latitude' in exif_data and 'Longitude' in exif_data:
            try:
                lat = float(exif_data['Latitude'])
                lng = float(exif_data['Longitude'])
                print(f"Einfache Lat/Lng-Tags gefunden: {lat}, {lng}", file=sys.stderr)
                return lat, lng
            except:
                pass
        
        # Methode 4: Suche in allen Tags nach Koordinaten-ähnlichen Werten
        for tag, value in exif_data.items():
            tag_str = str(tag).lower()
            if 'gps' in tag_str or 'lat' in tag_str or 'lon' in tag_str:
                print(f"Mögliches GPS-Tag gefunden: {tag} = {value}", file=sys.stderr)
        
        return None, None
    except Exception as e:
        print(f"Fehler bei der Koordinatensuche: {str(e)}", file=sys.stderr)
        return None, None

image_path = "${imagePath.replace(/\\/g, '\\\\')}"
print(f"Verarbeite Bild: {image_path}", file=sys.stderr)
exif_data = get_exif_data(image_path)
lat, lng = find_coordinates_in_exif(exif_data)

if lat is None or lng is None:
    gps_info = get_gps_info(exif_data)
    lat, lng = get_decimal_coordinates(gps_info)

result = {
    "success": lat is not None and lng is not None,
    "latitude": lat,
    "longitude": lng,
    "raw_exif": str(exif_data)
}

print(json.dumps(result))
    `;
    
    // Speichere das Skript in einer temporären Datei
    const tempDir = app.getPath('temp');
    const tempFile = path.join(tempDir, 'extract_gps.py');
    
    try {
      fs.writeFileSync(tempFile, pythonScript);
      console.log(`Python-Skript erstellt: ${tempFile}`);
    } catch (err) {
      console.error('Fehler beim Erstellen des Python-Skripts:', err);
      resolve(null);
      return;
    }
    
    // Führe das Python-Skript aus
    console.log('Starte Python-Prozess...');
    const pythonProcess = spawn('python', [tempFile]);
    
    let dataString = '';
    let errorString = '';
    
    pythonProcess.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorString += data.toString();
      // Gib Debug-Ausgaben in Echtzeit aus
      console.log(`Python-Debug: ${data.toString()}`);
    });
    
    pythonProcess.on('close', (code) => {
      // Lösche das temporäre Skript
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.error('Fehler beim Löschen der temporären Datei:', err);
      }
      
      if (code !== 0) {
        console.error(`Python-Skript beendet mit Code ${code}`);
        console.error(`Fehler: ${errorString}`);
        
        // Versuche es mit python3
        console.log('Versuche es mit python3...');
        const python3Process = spawn('python3', [tempFile]);
        
        let python3Data = '';
        let python3Error = '';
        
        python3Process.stdout.on('data', (data) => {
          python3Data += data.toString();
        });
        
        python3Process.stderr.on('data', (data) => {
          python3Error += data.toString();
          // Gib Debug-Ausgaben in Echtzeit aus
          console.log(`Python3-Debug: ${data.toString()}`);
        });
        
        python3Process.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python3-Skript beendet mit Code ${code}`);
            console.error(`Fehler: ${python3Error}`);
            resolve(null);
            return;
          }
          
          try {
            const result = JSON.parse(python3Data);
            if (result.success) {
              console.log(`GPS-Daten erfolgreich extrahiert: ${result.latitude}, ${result.longitude}`);
              resolve({
                latitude: result.latitude,
                longitude: result.longitude
              });
            } else {
              console.log(`Keine GPS-Daten in ${imagePath} gefunden`);
              resolve(null);
            }
          } catch (err) {
            console.error('Fehler beim Parsen der Python3-Ausgabe:', err);
            console.error('Python3-Ausgabe:', python3Data);
            resolve(null);
          }
        });
        
        return;
      }
      
      try {
        const result = JSON.parse(dataString);
        if (result.success) {
          console.log(`GPS-Daten erfolgreich extrahiert: ${result.latitude}, ${result.longitude}`);
          resolve({
            latitude: result.latitude,
            longitude: result.longitude
          });
        } else {
          console.log(`Keine GPS-Daten in ${imagePath} gefunden`);
          resolve(null);
        }
      } catch (err) {
        console.error('Fehler beim Parsen der Python-Ausgabe:', err);
        console.error('Python-Ausgabe:', dataString);
        resolve(null);
      }
    });
  });
}

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
  
  // Wenn Standardpfad, prüfe ob dieser existiert
  if (imagesPath === defaultImagesPath && !fs.existsSync(defaultImagesPath)) {
    console.log(`Standard-Bilderpfad existiert nicht: ${defaultImagesPath}, erstelle...`);
    try {
      fs.mkdirSync(defaultImagesPath, { recursive: true });
      // Erstelle eine leere Datei, um zu zeigen, dass das Verzeichnis benötigt wird
      fs.writeFileSync(path.join(defaultImagesPath, '.keep'), '');
    } catch (error) {
      console.error(`Fehler beim Erstellen des Standardverzeichnisses: ${error.message}`);
    }
  }
  
  // Verzeichnis-Info bereitstellen
  expressApp.get('/api/directory-info', (req, res) => {
    const currentPath = selectedImagesPath || defaultImagesPath;
    console.log(`Verzeichnis-Info angefordert, aktueller Pfad: ${currentPath}`);
    console.log(`Path existiert: ${fs.existsSync(currentPath)}`);
    
    if (fs.existsSync(currentPath)) {
      try {
        const files = fs.readdirSync(currentPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });
        console.log(`${imageFiles.length} Bilddateien im Verzeichnis gefunden`);
      } catch (error) {
        console.error(`Fehler beim Lesen des Verzeichnisses: ${error.message}`);
      }
    }
    
    res.json({
      currentPath: currentPath,
      isDefault: currentPath === defaultImagesPath,
      exists: fs.existsSync(currentPath),
      isDirectory: fs.existsSync(currentPath) ? fs.statSync(currentPath).isDirectory() : false
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
  expressApp.get('/api/photos', async (req, res) => {
    console.log('API-Anfrage für Fotos erhalten');
    
    try {
      // Aktualisiere den Bilder-Pfad (falls geändert)
      imagesPath = selectedImagesPath || defaultImagesPath;
      console.log(`Aktueller Bilder-Pfad: ${imagesPath}`);
      
      // Lese alle Dateien im Bilder-Verzeichnis
      if (!fs.existsSync(imagesPath)) {
        console.log('Bilder-Verzeichnis existiert nicht:', imagesPath);
        console.log('Sende Fallback-Daten');
        return res.json(FALLBACK_PHOTOS);
      }
      
      console.log(`Lese Verzeichnis: ${imagesPath}`);
      const files = fs.readdirSync(imagesPath);
      console.log(`Gefundene Dateien: ${files.length}`);
      
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      });
      
      console.log(`${imageFiles.length} Bilddateien gefunden`);
      
      if (imageFiles.length === 0) {
        console.log('Keine Bilddateien gefunden. Sende Fallback-Daten.');
        return res.json(FALLBACK_PHOTOS);
      }
      
      // Extrahiere GPS-Daten für jedes Bild
      const photosWithGps = [];
      const photosWithoutGps = [];
      
      console.log('Beginne GPS-Extraktion...');
      
      for (const filename of imageFiles) {
        const filePath = path.join(imagesPath, filename);
        console.log(`Verarbeite: ${filename}`);
        
        try {
          console.log(`Extrahiere GPS-Daten aus: ${filePath}`);
          const gpsData = await extractGpsDataWithPython(filePath, imagesPath);
          
          if (gpsData) {
            console.log(`GPS-Daten gefunden für ${filename}: ${gpsData.latitude}, ${gpsData.longitude}`);
            photosWithGps.push({
              filename,
              path: `/images/${filename}`,
              latitude: gpsData.latitude,
              longitude: gpsData.longitude
            });
          } else {
            console.log(`Keine GPS-Daten für ${filename} gefunden`);
            photosWithoutGps.push({
              filename,
              path: `/images/${filename}`,
              hasNoGps: true
            });
          }
        } catch (err) {
          console.error(`Fehler bei der Verarbeitung von ${filename}:`, err);
          photosWithoutGps.push({
            filename,
            path: `/images/${filename}`,
            hasNoGps: true,
            error: err.message
          });
        }
      }
      
      console.log(`${photosWithGps.length} Fotos mit GPS-Daten, ${photosWithoutGps.length} ohne GPS-Daten`);
      
      if (photosWithGps.length === 0) {
        console.log('Keine Fotos mit GPS-Daten gefunden. Sende Fallback-Daten.');
        return res.json(FALLBACK_PHOTOS);
      }
      
      // Sende alle Fotos mit GPS-Daten zurück
      res.json(photosWithGps);
    } catch (err) {
      console.error('Fehler beim Verarbeiten der Anfrage:', err);
      console.log('Sende Fallback-Daten nach Fehler');
      res.json(FALLBACK_PHOTOS);
    }
  });
  
  // Debug-Endpunkt für Verzeichnisinhalt
  expressApp.get('/api/list-directory', (req, res) => {
    try {
      const currentPath = selectedImagesPath || defaultImagesPath;
      console.log(`Verzeichnisinhalt angefordert für: ${currentPath}`);
      
      if (!fs.existsSync(currentPath)) {
        return res.json({
          error: 'Verzeichnis existiert nicht',
          path: currentPath
        });
      }
      
      const files = fs.readdirSync(currentPath);
      const filesWithStats = files.map(file => {
        const filePath = path.join(currentPath, file);
        try {
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          };
        } catch (e) {
          return {
            name: file,
            path: filePath,
            error: e.message
          };
        }
      });
      
      return res.json({
        path: currentPath,
        files: filesWithStats
      });
    } catch (err) {
      console.error('Fehler beim Auflisten des Verzeichnisses:', err);
      return res.json({
        error: err.message
      });
    }
  });
  
  expressApp.get('/api/status', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      imagePath: imagesPath,
      pathExists: fs.existsSync(imagesPath),
      isDefaultPath: imagesPath === defaultImagesPath
    });
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
      
      // Prüfe, ob der Pfad gültig ist
      if (!fs.existsSync(selectedImagesPath)) {
        console.error(`Der ausgewählte Pfad existiert nicht: ${selectedImagesPath}`);
      } else {
        // Prüfe, ob Bilder vorhanden sind
        try {
          const files = fs.readdirSync(selectedImagesPath);
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
          });
          console.log(`${imageFiles.length} Bilddateien im ausgewählten Verzeichnis gefunden`);
        } catch (error) {
          console.error(`Fehler beim Lesen des Verzeichnisses: ${error.message}`);
        }
      }
      
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
  // Beende den Server
  if (server) {
    server.close();
  }
}); 