# Technik25 GPS Map

Eine Webanwendung zur Visualisierung von Fotos auf einer Karte basierend auf ihren GPS-Koordinaten.

## Funktionen

- Anzeige von Fotos auf einer OpenStreetMap-Karte basierend auf ihren GPS-Koordinaten
- Anklicken von Markern, um die Fotos anzuzeigen
- Vollbildansicht für Fotos
- Ein- und ausblendbare Debug-Informationen
- Automatisches Auslesen der GPS-Daten aus den EXIF-Metadaten der Fotos

## Technologien

### Backend
- Python mit FastAPI
- exifread für das Auslesen der EXIF-Daten
- Statische Dateibereitstellung für Bilder

### Frontend
- React 19
- Leaflet und react-leaflet für die Kartenintegration

## Installation und Start

### Backend

1. Installieren Sie die erforderlichen Python-Pakete:
   ```
   pip install fastapi uvicorn exifread
   ```

2. Erstellen Sie einen `images/`-Ordner und legen Sie Ihre Fotos darin ab.

3. Starten Sie den Backend-Server:
   ```
   python -m uvicorn main:app --reload
   ```

### Frontend

1. Navigieren Sie zum Frontend-Verzeichnis:
   ```
   cd frontend
   ```

2. Installieren Sie die Abhängigkeiten:
   ```
   npm install
   ```

3. Starten Sie die Anwendung:
   ```
   npm start
   ```

## Verwendung

1. Öffnen Sie die Anwendung in Ihrem Browser unter `http://localhost:3000` (oder dem Port, den der Entwicklungsserver anzeigt).
2. Die Karte wird mit Markern für jedes Foto mit GPS-Daten angezeigt.
3. Klicken Sie auf einen Marker, um das entsprechende Foto anzuzeigen.
4. Klicken Sie auf das Foto oder den "Vollbild"-Button, um das Foto im Vollbildmodus anzuzeigen.
5. Verwenden Sie den Button in der unteren rechten Ecke, um Debug-Informationen ein- oder auszublenden.

## Hinweise

- Die Fotos müssen GPS-Metadaten enthalten, damit sie auf der Karte angezeigt werden können.

## Entwickler

Entwickelt von Martin Bundschuh 