# Technik25 GPS Map

Eine Webanwendung zur Visualisierung von Fotos auf einer Karte basierend auf ihren GPS-Koordinaten.

## Funktionen

- Anzeige von Fotos auf einer interaktiven Karte basierend auf GPS-Metadaten
- Unterstützung für verschiedene Kartenansichten (OpenStreetMap, Satellit, Topographisch)
- Marker-Clustering für bessere Übersicht bei vielen Fotos
- Anzeige von Foto-Vorschaubildern beim Klicken auf Marker
- Ladebildschirm während der Initialisierung
- Anzeige der Gesamtanzahl der Fotos

## Voraussetzungen

- Node.js (v14 oder höher)
- Python 3.x (für den Backend-Server)
- Bilder mit GPS-Metadaten im Verzeichnis `images/`

## Installation

1. Klonen Sie das Repository:
   ```
   git clone https://github.com/CodeNinjaGuy/technik25-gps-map.git
   cd technik25-gps-map
   ```

2. Installieren Sie die Abhängigkeiten:
   ```
   npm install
   pip install pillow
   ```

## Verwendung

### Entwicklungsmodus

1. Starten Sie den Backend-Server:
   ```
   node server.js
   ```

2. Starten Sie den Frontend-Server in einem separaten Terminal:
   ```
   npm start
   ```

3. Öffnen Sie die Anwendung in Ihrem Browser unter `http://localhost:3000`

### Electron-Entwicklungsmodus

Um die Anwendung als Electron-App im Entwicklungsmodus zu starten:

```
npm run electron:dev
```

### Kompilieren einer eigenständigen Anwendung

Sie können eine eigenständige Desktop-Anwendung erstellen, die mit einem Klick gestartet werden kann:

1. Bauen Sie die Anwendung:
   ```
   npm run electron:build
   ```

2. Die kompilierte Anwendung finden Sie im Verzeichnis `dist/`:
   - Windows: `dist/Technik25 GPS Map Setup.exe`
   - macOS: `dist/Technik25 GPS Map.dmg`
   - Linux: `dist/Technik25 GPS Map.AppImage`

## Hinweise zur Verwendung

- Legen Sie Ihre Fotos mit GPS-Metadaten im Verzeichnis `images/` ab
- Die Anwendung unterstützt gängige Bildformate wie JPG, JPEG, PNG
- Fotos ohne GPS-Metadaten werden nicht auf der Karte angezeigt
- Für eine optimale Leistung wird empfohlen, nicht mehr als einige tausend Fotos gleichzeitig zu verwalten

## Technologien

- Frontend: React, Leaflet, React-Leaflet
- Backend: Node.js, Express
- Metadaten-Extraktion: Python (Pillow)
- Desktop-Anwendung: Electron

## Lizenz

MIT

## Autor

CodeNinjaGuy 