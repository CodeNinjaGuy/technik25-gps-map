# Technik25 GPS Map

Eine Webanwendung zur Visualisierung von Fotos auf einer Karte basierend auf ihren GPS-Koordinaten.

## Funktionen

- Anzeige von Fotos auf einer Karte basierend auf ihren GPS-Koordinaten
- Mehrere Kartenansichten: Straßenkarte, Satellitenansicht und topographische Karte
- Marker-Clustering für bessere Übersicht bei vielen Fotos
- Anklicken von Markern, um die Fotos anzuzeigen
- Vollbildansicht für Fotos
- Ein- und ausblendbare Debug-Informationen
- Foto-Zähler zur Anzeige der geladenen Fotos
- Ladebildschirm während des Datenabrufs
- Automatisches Auslesen der GPS-Daten aus den EXIF-Metadaten der Fotos

## Technologien

### Backend
- Python mit FastAPI
- exifread für das Auslesen der EXIF-Daten
- Statische Dateibereitstellung für Bilder

### Frontend
- React 19
- Leaflet und react-leaflet für die Kartenintegration
- react-leaflet-markercluster für das Clustering von Markern

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
2. Die Karte wird mit Markern für jedes Foto mit GPS-Daten angezeigt. Marker in der Nähe werden zu Clustern zusammengefasst.
3. Verwenden Sie die Layer-Kontrolle in der oberen rechten Ecke, um zwischen Straßenkarte, Satellitenansicht und topographischer Karte zu wechseln.
4. Klicken Sie auf einen Marker oder Cluster, um die Fotos anzuzeigen.
5. Klicken Sie auf das Foto oder den "Vollbild"-Button, um das Foto im Vollbildmodus anzuzeigen.
6. Verwenden Sie den Button in der unteren rechten Ecke, um Debug-Informationen ein- oder auszublenden.
7. In der oberen rechten Ecke sehen Sie die Anzahl der geladenen Fotos.

## Hinweise

- Die Fotos müssen GPS-Metadaten enthalten, damit sie auf der Karte angezeigt werden können.

## Entwickler

Entwickelt von Martin Bundschuh 