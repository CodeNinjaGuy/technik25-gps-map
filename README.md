# Technik25 GPS Map

Eine Electron-Anwendung zum Visualisieren von Fotos auf einer Karte basierend auf ihren GPS-Koordinaten.

## Funktionen

- Fotos mit GPS-Metadaten auf einer interaktiven Karte anzeigen
- Wechsel zwischen verschiedenen Kartenansichten (OpenStreetMap, Satellit, Topografisch)
- Marker-Clustering für bessere Übersichtlichkeit bei vielen Fotos
- Bildergalerie mit Metadaten-Anzeige
- Auswahl unterschiedlicher Bildverzeichnisse
- Echtzeit-Aktualisierung der Karte
- Vollbildansicht für Fotos

## Neue Funktionen

- **Python-basierte GPS-Extraktion**: Zuverlässigere Methode zur Extraktion von GPS-Daten aus Fotos ohne Abhängigkeit von ExifTool
- **Verbesserte Fehlerbehandlung**: Automatische Wiederholungsversuche und detaillierte Debug-Informationen
- **Dynamisches Kartenzentrum**: Die Karte zentriert sich automatisch auf die vorhandenen Fotos

## Voraussetzungen

- Node.js 20+
- npm oder yarn
- Python 3.x mit Pillow (PIL) installiert

## Installation

1. Klonen Sie das Repository:
   ```
   git clone https://github.com/CodeNinjaGuy/technik25-gps-map.git
   cd technik25-gps-map
   ```

2. Installieren Sie die Abhängigkeiten:
   ```
   npm install
   ```

3. Installieren Sie Python und Pillow:
   ```
   pip install Pillow
   ```

## Entwicklung

Starten Sie die Anwendung im Entwicklungsmodus:
```
npm run electron-dev
```

## Build

Erstellen Sie eine ausführbare Datei für Ihr Betriebssystem:
```
npm run electron-build
```

## Verwendung

- Klicken Sie auf "Verzeichnis auswählen", um einen Ordner mit Fotos auszuwählen
- Die Fotos mit GPS-Daten werden auf der Karte angezeigt
- Klicken Sie auf einen Marker, um das Foto und dessen Koordinaten zu sehen
- Wechseln Sie die Kartenansicht mit den Schaltflächen oben rechts
- Klicken Sie auf ein Foto in einem Popup, um es im Vollbildmodus anzuzeigen

## Fehlerbehebung

- **Keine Fotos werden angezeigt**: Stellen Sie sicher, dass Ihre Fotos GPS-Metadaten enthalten
- **Python-Fehler**: Überprüfen Sie, ob Python und Pillow korrekt installiert sind
- **Bildpfade-Probleme**: Bei Problemen mit Bildpfaden überprüfen Sie die URLs in der Konsole
- **Entwicklerwerkzeuge**: Öffnen Sie die Chrome DevTools (Strg+Shift+I / Cmd+Opt+I), um Fehler zu sehen

## Technologien

- Frontend: React, Leaflet, React-Leaflet
- Backend: Node.js, Express
- Metadaten-Extraktion: Python (Pillow)
- Desktop-Anwendung: Electron

## Lizenz

MIT

## Autor

CodeNinjaGuy 