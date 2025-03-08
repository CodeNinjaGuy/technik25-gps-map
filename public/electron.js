const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');

let mainWindow;
let serverProcess;
let server;
let serverStarted = false;

function createWindow() {
  // Erstelle das Browser-Fenster
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Fenster erst anzeigen, wenn es vollständig geladen ist
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // Deaktiviere die Web-Sicherheit, um lokale Dateien zu laden
      javascript: true, // Stelle sicher, dass JavaScript aktiviert ist
      devTools: true // Stelle sicher, dass DevTools aktiviert sind
    },
    icon: path.join(__dirname, 'favicon.ico')
  });

  // Lade die index.html der App
  const indexPath = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  console.log('Lade Anwendung von:', indexPath);
  
  // Füge Event-Listener für Fehler beim Laden hinzu
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Fehler beim Laden der Anwendung:', errorCode, errorDescription);
    dialog.showErrorBox('Fehler beim Laden', `Die Anwendung konnte nicht geladen werden: ${errorDescription}`);
    
    // Versuche erneut zu laden
    setTimeout(() => {
      console.log('Versuche erneut zu laden...');
      mainWindow.loadURL(indexPath);
    }, 2000);
  });

  // Füge Event-Listener für Fehler in der Webseite hinzu
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[WebContents] ${message}`);
    if (level === 2) { // Fehler
      console.error(`Fehler in der Webseite: ${message}`);
    }
  });

  // Zeige das Fenster erst, wenn es vollständig geladen ist
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Anwendung vollständig geladen');
    mainWindow.show();
  });

  // Lade die Anwendung
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
  // Im Entwicklungsmodus den Server als separaten Prozess starten
  if (isDev) {
    const serverPath = path.join(__dirname, '../server.js');
    console.log('Server-Pfad (Dev):', serverPath);
    
    if (fs.existsSync(serverPath)) {
      console.log('Starte Server als separaten Prozess...');
      serverProcess = spawn('node', [serverPath], {
        stdio: 'inherit',
        env: process.env
      });
      
      serverProcess.on('error', (error) => {
        console.error('Server-Fehler:', error);
        dialog.showErrorBox('Server-Fehler', `Der Server konnte nicht gestartet werden: ${error.message}`);
      });

      // Warte kurz, bis der Server gestartet ist
      setTimeout(() => {
        serverStarted = true;
        createWindow();
      }, 2000);
    } else {
      console.error('Server-Datei nicht gefunden:', serverPath);
      dialog.showErrorBox('Server-Fehler', `Die Server-Datei wurde nicht gefunden: ${serverPath}`);
    }
    return;
  }
  
  // Im Produktionsmodus den Server direkt einbinden
  console.log('Starte eingebetteten Server...');
  
  try {
    // Express-Server erstellen
    const expressApp = express();
    const PORT = process.env.PORT || 3001;
    
    // CORS für Entwicklung aktivieren
    expressApp.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Bestimme den Pfad zum Bilder-Verzeichnis
    const imagesPath = process.env.IMAGES_PATH || path.join(process.resourcesPath, 'images');
    console.log('Bilder-Verzeichnis:', imagesPath);
    
    // Statische Dateien bereitstellen
    expressApp.use('/images', express.static(imagesPath, {
      setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET');
      }
    }));
    
    // Überprüfe, ob das Bilder-Verzeichnis existiert
    if (!fs.existsSync(imagesPath)) {
      console.error(`Fehler: Das Bilder-Verzeichnis existiert nicht: ${imagesPath}`);
      fs.mkdirSync(imagesPath, { recursive: true });
      console.log(`Bilder-Verzeichnis wurde erstellt: ${imagesPath}`);
    }
    
    // API-Endpunkt für Foto-Metadaten
    expressApp.get('/api/photos', (req, res) => {
      console.log('API-Anfrage für Fotos erhalten');
      
      try {
        // Lese alle Dateien im Bilder-Verzeichnis
        const files = fs.readdirSync(imagesPath);
        const imageFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });
        
        console.log(`${imageFiles.length} Bilddateien gefunden`);
        
        if (imageFiles.length === 0) {
          console.log('Keine Bilddateien gefunden. Sende leere Liste.');
          return res.json([]);
        }
        
        // Extrahiere GPS-Daten mit Python-Skript
        const pythonScript = `
import os
import json
import sys
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS

def get_exif_data(image):
    exif_data = {}
    try:
        img = Image.open(image)
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif:
                for tag, value in exif.items():
                    decoded = TAGS.get(tag, tag)
                    exif_data[decoded] = value
    except Exception as e:
        print(f"Fehler beim Lesen der EXIF-Daten: {e}", file=sys.stderr)
    return exif_data

def get_gps_info(exif_data):
    gps_info = {}
    if 'GPSInfo' in exif_data:
        for key, value in exif_data['GPSInfo'].items():
            decoded = GPSTAGS.get(key, key)
            gps_info[decoded] = value
    return gps_info

def get_decimal_coordinates(gps_info):
    if not gps_info or 'GPSLatitude' not in gps_info or 'GPSLongitude' not in gps_info:
        return None, None

    try:
        lat = gps_info['GPSLatitude']
        lat_ref = gps_info.get('GPSLatitudeRef', 'N')
        lng = gps_info['GPSLongitude']
        lng_ref = gps_info.get('GPSLongitudeRef', 'E')

        # Konvertiere die Koordinaten in Dezimalgrad
        lat_decimal = float(lat[0]) + float(lat[1])/60 + float(lat[2])/3600
        if lat_ref == 'S':
            lat_decimal = -lat_decimal

        lng_decimal = float(lng[0]) + float(lng[1])/60 + float(lng[2])/3600
        if lng_ref == 'W':
            lng_decimal = -lng_decimal

        return lat_decimal, lng_decimal
    except Exception as e:
        print(f"Fehler bei der Koordinatenberechnung: {e}", file=sys.stderr)
        return None, None

def process_images(directory):
    results = []
    try:
        for filename in os.listdir(directory):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                try:
                    filepath = os.path.join(directory, filename)
                    exif_data = get_exif_data(filepath)
                    gps_info = get_gps_info(exif_data)
                    lat, lng = get_decimal_coordinates(gps_info)
                    
                    if lat is not None and lng is not None:
                        results.append({
                            'filename': filename,
                            'path': f'/images/{filename}',
                            'latitude': lat,
                            'longitude': lng
                        })
                except Exception as e:
                    print(f"Fehler bei der Verarbeitung von {filename}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"Fehler beim Durchsuchen des Verzeichnisses: {e}", file=sys.stderr)
    
    return results

# Hauptfunktion
try:
    images_dir = '${imagesPath.replace(/\\/g, '\\\\')}'
    photo_data = process_images(images_dir)
    print(json.dumps(photo_data))
except Exception as e:
    print(f"Unerwarteter Fehler: {e}", file=sys.stderr)
    print("[]")  # Leere Liste als Fallback
        `;
        
        // Temporäre Python-Datei erstellen
        const tempPyFile = path.join(app.getPath('temp'), 'temp_extract_gps.py');
        fs.writeFileSync(tempPyFile, pythonScript);
        
        // Python-Skript ausführen
        exec(`python ${tempPyFile}`, (error, stdout, stderr) => {
          // Temporäre Datei löschen
          try {
            fs.unlinkSync(tempPyFile);
          } catch (err) {
            console.error('Fehler beim Löschen der temporären Python-Datei:', err);
          }
          
          if (stderr) {
            console.error('Python-Fehlerausgabe:', stderr);
          }
          
          if (error) {
            console.error(`Fehler bei der Ausführung des Python-Skripts: ${error.message}`);
            
            // Versuche es mit Python3 statt Python
            exec(`python3 ${tempPyFile}`, (error2, stdout2, stderr2) => {
              if (stderr2) {
                console.error('Python3-Fehlerausgabe:', stderr2);
              }
              
              if (error2) {
                console.error(`Fehler bei der Ausführung mit python3: ${error2.message}`);
                return res.json([{
                  filename: 'beispiel.jpg',
                  path: '/images/beispiel.jpg',
                  latitude: 51.1657,
                  longitude: 10.4515
                }]);
              }
              
              try {
                const photoData = JSON.parse(stdout2);
                console.log(`${photoData.length} Fotos mit GPS-Daten gefunden`);
                
                // Wenn keine Fotos mit GPS-Daten gefunden wurden, sende eine Beispiel-Koordinate
                if (photoData.length === 0) {
                  console.log('Keine Fotos mit GPS-Daten gefunden. Sende Beispiel-Koordinate.');
                  return res.json([{
                    filename: 'beispiel.jpg',
                    path: '/images/beispiel.jpg',
                    latitude: 51.1657,
                    longitude: 10.4515
                  }]);
                }
                
                res.json(photoData);
              } catch (parseError) {
                console.error('Fehler beim Parsen der Python-Ausgabe:', parseError);
                console.error('Python-Ausgabe:', stdout2);
                return res.json([{
                  filename: 'beispiel.jpg',
                  path: '/images/beispiel.jpg',
                  latitude: 51.1657,
                  longitude: 10.4515
                }]);
              }
            });
            return;
          }
          
          try {
            const photoData = JSON.parse(stdout);
            console.log(`${photoData.length} Fotos mit GPS-Daten gefunden`);
            
            // Wenn keine Fotos mit GPS-Daten gefunden wurden, sende eine Beispiel-Koordinate
            if (photoData.length === 0) {
              console.log('Keine Fotos mit GPS-Daten gefunden. Sende Beispiel-Koordinate.');
              return res.json([{
                filename: 'beispiel.jpg',
                path: '/images/beispiel.jpg',
                latitude: 51.1657,
                longitude: 10.4515
              }]);
            }
            
            res.json(photoData);
          } catch (parseError) {
            console.error('Fehler beim Parsen der Python-Ausgabe:', parseError);
            console.error('Python-Ausgabe:', stdout);
            return res.json([{
              filename: 'beispiel.jpg',
              path: '/images/beispiel.jpg',
              latitude: 51.1657,
              longitude: 10.4515
            }]);
          }
        });
      } catch (err) {
        console.error('Fehler beim Verarbeiten der Anfrage:', err);
        res.json([{
          filename: 'beispiel.jpg',
          path: '/images/beispiel.jpg',
          latitude: 51.1657,
          longitude: 10.4515
        }]);
      }
    });
    
    // API-Endpunkt für Server-Status
    expressApp.get('/api/status', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Statische Dateien aus dem Build-Verzeichnis bereitstellen
    const buildPath = path.join(__dirname, '../build');
    console.log('Build-Verzeichnis:', buildPath);
    
    if (fs.existsSync(buildPath)) {
      expressApp.use(express.static(buildPath));
      
      expressApp.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
      });
      
      console.log('Build-Verzeichnis gefunden und konfiguriert');
    } else {
      console.warn(`Warnung: Build-Verzeichnis existiert nicht: ${buildPath}`);
    }
    
    // Server starten
    server = expressApp.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
      console.log(`API-Endpunkt: http://localhost:${PORT}/api/photos`);
      console.log(`Bilder-Verzeichnis: ${imagesPath}`);
      
      // Setze Flag, dass der Server gestartet ist
      serverStarted = true;
      
      // Starte das Fenster erst, wenn der Server bereit ist
      createWindow();
    });
  } catch (error) {
    console.error('Fehler beim Starten des eingebetteten Servers:', error);
    dialog.showErrorBox('Server-Fehler', `Der eingebettete Server konnte nicht gestartet werden: ${error.message}`);
  }
}

// IPC-Kommunikation für Debugging
ipcMain.on('log-message', (event, message) => {
  console.log(`[Renderer] ${message}`);
});

ipcMain.on('error-message', (event, message) => {
  console.error(`[Renderer] ${message}`);
});

app.on('ready', () => {
  console.log('Electron-App wird gestartet...');
  console.log('Entwicklungsmodus:', isDev);
  console.log('App-Pfad:', app.getAppPath());
  
  if (!isDev) {
    console.log('Ressourcen-Pfad:', process.resourcesPath);
    // Setze die Umgebungsvariable für den Produktionsmodus
    process.env.NODE_ENV = 'production';
  }
  
  startServer();
  // Das Fenster wird jetzt erst erstellt, wenn der Server gestartet ist
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null && serverStarted) {
    createWindow();
  }
});

app.on('will-quit', () => {
  // Beende den Server-Prozess, wenn die App geschlossen wird
  if (serverProcess) {
    console.log('Beende Server-Prozess...');
    serverProcess.kill();
  }
  
  if (server) {
    console.log('Beende eingebetteten Server...');
    server.close();
  }
}); 