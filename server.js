const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS für Entwicklung aktivieren
app.use(cors());

// Bestimme den Pfad zum Bilder-Verzeichnis
const imagesPath = process.env.IMAGES_PATH || path.join(__dirname, 'images');
console.log('Bilder-Verzeichnis:', imagesPath);

// Statische Dateien bereitstellen
app.use('/images', express.static(imagesPath));

// Überprüfe, ob das Bilder-Verzeichnis existiert
if (!fs.existsSync(imagesPath)) {
  console.error(`Fehler: Das Bilder-Verzeichnis existiert nicht: ${imagesPath}`);
  fs.mkdirSync(imagesPath, { recursive: true });
  console.log(`Bilder-Verzeichnis wurde erstellt: ${imagesPath}`);
}

// API-Endpunkt für Foto-Metadaten
app.get('/api/photos', (req, res) => {
  console.log('API-Anfrage für Fotos erhalten');
  
  try {
    // Lese alle Dateien im Bilder-Verzeichnis
    const files = fs.readdirSync(imagesPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });
    
    console.log(`${imageFiles.length} Bilddateien gefunden`);
    
    // Extrahiere GPS-Daten mit Python-Skript
    const pythonScript = `
import os
import json
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
        print(f"Fehler beim Lesen der EXIF-Daten: {e}")
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

    lat = gps_info['GPSLatitude']
    lat_ref = gps_info.get('GPSLatitudeRef', 'N')
    lng = gps_info['GPSLongitude']
    lng_ref = gps_info.get('GPSLongitudeRef', 'E')

    lat_decimal = lat[0] + lat[1]/60 + lat[2]/3600
    if lat_ref == 'S':
        lat_decimal = -lat_decimal

    lng_decimal = lng[0] + lng[1]/60 + lng[2]/3600
    if lng_ref == 'W':
        lng_decimal = -lng_decimal

    return lat_decimal, lng_decimal

def process_images(directory):
    results = []
    for filename in os.listdir(directory):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
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
    return results

# Hauptfunktion
images_dir = '${imagesPath.replace(/\\/g, '\\\\')}'
photo_data = process_images(images_dir)
print(json.dumps(photo_data))
    `;
    
    // Temporäre Python-Datei erstellen
    const tempPyFile = path.join(__dirname, 'temp_extract_gps.py');
    fs.writeFileSync(tempPyFile, pythonScript);
    
    // Python-Skript ausführen
    exec(`python ${tempPyFile}`, (error, stdout, stderr) => {
      // Temporäre Datei löschen
      try {
        fs.unlinkSync(tempPyFile);
      } catch (err) {
        console.error('Fehler beim Löschen der temporären Python-Datei:', err);
      }
      
      if (error) {
        console.error(`Fehler bei der Ausführung des Python-Skripts: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        return res.status(500).json({ error: 'Fehler bei der Verarbeitung der Bilder' });
      }
      
      try {
        const photoData = JSON.parse(stdout);
        console.log(`${photoData.length} Fotos mit GPS-Daten gefunden`);
        res.json(photoData);
      } catch (parseError) {
        console.error('Fehler beim Parsen der Python-Ausgabe:', parseError);
        console.error('Python-Ausgabe:', stdout);
        res.status(500).json({ error: 'Fehler beim Parsen der Metadaten' });
      }
    });
  } catch (err) {
    console.error('Fehler beim Verarbeiten der Anfrage:', err);
    res.status(500).json({ error: err.message });
  }
});

// Für Produktionsumgebung: Statische Dateien aus dem Build-Verzeichnis bereitstellen
if (process.env.NODE_ENV === 'production') {
  console.log('Produktionsmodus: Statische Dateien werden bereitgestellt');
  
  // Bestimme den Pfad zum Build-Verzeichnis
  const buildPath = path.join(__dirname, 'build');
  console.log('Build-Verzeichnis:', buildPath);
  
  if (fs.existsSync(buildPath)) {
    // Statische Dateien aus dem Build-Verzeichnis bereitstellen
    app.use(express.static(buildPath));
    
    // Alle anderen Anfragen an index.html weiterleiten (für React Router)
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
    
    console.log('Build-Verzeichnis gefunden und konfiguriert');
  } else {
    console.warn(`Warnung: Build-Verzeichnis existiert nicht: ${buildPath}`);
    
    // Versuche, das Build-Verzeichnis relativ zum aktuellen Arbeitsverzeichnis zu finden
    const altBuildPath = path.join(process.cwd(), 'build');
    console.log('Alternatives Build-Verzeichnis:', altBuildPath);
    
    if (fs.existsSync(altBuildPath)) {
      app.use(express.static(altBuildPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(altBuildPath, 'index.html'));
      });
      console.log('Alternatives Build-Verzeichnis gefunden und konfiguriert');
    } else {
      console.error('Kein Build-Verzeichnis gefunden. Die Anwendung wird möglicherweise nicht korrekt funktionieren.');
    }
  }
}

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
  console.log(`API-Endpunkt: http://localhost:${PORT}/api/photos`);
  console.log(`Bilder-Verzeichnis: ${imagesPath}`);
  console.log(`Umgebung: ${process.env.NODE_ENV || 'development'}`);
}); 