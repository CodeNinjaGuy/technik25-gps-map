import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './LeafletMap.css';

// Korrigiere die Icon-URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Layer-Auswahl-Komponente
function ChangeMapLayer({ activeMapType, setActiveMapType }) {
  const map = useMap();

  useEffect(() => {
    const baseLayers = {
      'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }),
      'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }),
      'Topographic': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
      })
    };

    // Entferne alle vorhandenen Layer
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    // Füge den ausgewählten Layer hinzu
    baseLayers[activeMapType].addTo(map);

  }, [map, activeMapType]);

  return (
    <div className="map-type-selector">
      <button 
        className={activeMapType === 'OpenStreetMap' ? 'active' : ''}
        onClick={() => setActiveMapType('OpenStreetMap')}
      >
        OpenStreetMap
      </button>
      <button 
        className={activeMapType === 'Satellite' ? 'active' : ''}
        onClick={() => setActiveMapType('Satellite')}
      >
        Satellit
      </button>
      <button 
        className={activeMapType === 'Topographic' ? 'active' : ''}
        onClick={() => setActiveMapType('Topographic')}
      >
        Topografisch
      </button>
    </div>
  );
}

// Prüfe, ob die Electron-Umgebung verfügbar ist
const isElectronAvailable = () => {
  return window && window.electron && window.electron.ipcRenderer;
};

function LeafletMap() {
  const [photos, setPhotos] = useState([]);
  const [directoryInfo, setDirectoryInfo] = useState({ currentPath: '', isDefault: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMapType, setActiveMapType] = useState('OpenStreetMap');
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [mapKey, setMapKey] = useState(Date.now()); // Erzwingt Map-Neuzeichnung
  const [debugInfo, setDebugInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const [directoryContent, setDirectoryContent] = useState(null);
  const mapRef = useRef(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [serverStatus, setServerStatus] = useState(null);

  const loadServerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/status');
      if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
      const data = await response.json();
      console.log('Server-Status geladen:', data);
      setServerStatus(data);
      return data;
    } catch (error) {
      console.error('Fehler beim Laden des Server-Status:', error);
      return null;
    }
  };

  const loadDirectoryContent = async () => {
    try {
      console.log('Lade Verzeichnisinhalt...');
      const response = await fetch('http://localhost:3001/api/list-directory');
      if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
      const data = await response.json();
      console.log('Verzeichnisinhalt geladen:', data);
      setDirectoryContent(data);
      return data;
    } catch (error) {
      console.error('Fehler beim Laden des Verzeichnisinhalts:', error);
      return null;
    }
  };

  const loadDirectoryInfo = async () => {
    try {
      console.log('Lade Verzeichnis-Info...');
      const response = await fetch('http://localhost:3001/api/directory-info');
      if (!response.ok) throw new Error(`HTTP Fehler! Status: ${response.status}`);
      const data = await response.json();
      console.log('Verzeichnis-Info geladen:', data);
      setDirectoryInfo(data);
      return data;
    } catch (error) {
      console.error('Fehler beim Laden der Verzeichnis-Info:', error);
      setDebugInfo(prev => ({
        ...prev,
        directoryInfoError: error.message
      }));
      return null;
    }
  };

  const refreshPhotos = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      // Lade aktuellen Server-Status
      await loadServerStatus();
      
      console.log('Lade Fotos...');
      const response = await fetch('http://localhost:3001/api/photos');
      
      if (!response.ok) {
        throw new Error(`HTTP Fehler! Status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fotos geladen:', data);
      
      if (data && data.length > 0) {
        setPhotos(data);
        setMapKey(Date.now()); // Erzwingt Neuzeichnung der Karte
        
        // Prüfe, ob wir die Fallback-Daten erhalten haben
        const isFallbackData = data.some(photo => 
          photo.filename === 'beispiel1.jpg' || 
          photo.filename === 'beispiel2.jpg' || 
          photo.filename === 'beispiel3.jpg'
        );
        
        // Sammle Debug-Informationen
        setDebugInfo({
          photosLoaded: data.length,
          photosWithCoordinates: data.filter(p => p.latitude && p.longitude).length,
          photosWithoutCoordinates: data.filter(p => !p.latitude || !p.longitude).length,
          isFallbackData: isFallbackData,
          samplePhoto: data[0],
          timestamp: new Date().toISOString()
        });
        
        if (isFallbackData) {
          console.warn('Fallback-Daten erhalten. Versuche, Verzeichnisinformationen zu laden...');
          await loadDirectoryContent();
        }
      } else {
        console.warn('Keine Fotos gefunden oder leeres Array zurückgegeben');
        setPhotos([]);
        
        // Wenn wir noch nicht zu oft versucht haben, versuchen wir es erneut
        if (retryCount < maxRetries) {
          console.log(`Versuch ${retryCount + 1}/${maxRetries}. Neuer Versuch in 2 Sekunden...`);
          setRetryCount(prev => prev + 1);
          setTimeout(refreshPhotos, 2000);
          return;
        } else {
          await loadDirectoryContent();
          throw new Error('Keine Fotos mit GPS-Daten gefunden nach mehreren Versuchen.');
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Fotos:', error);
      setError(`Fehler beim Laden der Fotos: ${error.message}`);
      setDebugInfo(prev => ({
        ...prev,
        error: error.message,
        stack: error.stack
      }));
      
      // Versuche, Verzeichnisinformationen zu laden
      await loadDirectoryContent();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = () => {
    if (isElectronAvailable()) {
      window.electron.ipcRenderer.send('select-directory');
    } else {
      console.error('Electron ist nicht verfügbar. Diese Funktion funktioniert nur in der Desktop-App.');
      alert('Diese Funktion ist nur in der Electron-Desktop-App verfügbar, nicht im Browser.');
    }
  };

  const handleDirectoryChange = (event, data) => {
    console.log('Verzeichnis geändert:', data);
    setDirectoryInfo(data);
    refreshPhotos();
  };

  const initializeApp = async () => {
    const dirInfo = await loadDirectoryInfo();
    await loadServerStatus();
    if (dirInfo) {
      await refreshPhotos();
    }
  };

  useEffect(() => {
    console.log('LeafletMap komponente initialisiert');
    
    // IPC-Listener einrichten
    if (isElectronAvailable()) {
      window.electron.ipcRenderer.on('directory-changed', handleDirectoryChange);
      
      // Cleanup bei Unmount
      return () => {
        window.electron.ipcRenderer.removeListener('directory-changed', handleDirectoryChange);
      };
    }
    
    initializeApp();
  }, []);

  const openFullscreen = (imagePath) => {
    setFullscreenImage(imagePath);
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  // Berechne das Zentrum der Karte basierend auf den Fotos
  const getMapCenter = () => {
    if (photos.length === 0 || !photos.some(p => p.latitude && p.longitude)) {
      return [51.1657, 10.4515]; // Deutschland-Zentrum als Fallback
    }

    const validPhotos = photos.filter(p => p.latitude && p.longitude);
    const sumLat = validPhotos.reduce((sum, photo) => sum + photo.latitude, 0);
    const sumLng = validPhotos.reduce((sum, photo) => sum + photo.longitude, 0);
    
    return [sumLat / validPhotos.length, sumLng / validPhotos.length];
  };
  
  // Prüfe, ob wir die Demo-Daten anzeigen
  const isDemoData = photos.some(photo => 
    photo.filename === 'beispiel1.jpg' || 
    photo.filename === 'beispiel2.jpg' || 
    photo.filename === 'beispiel3.jpg'
  );

  // Rendere die Karte
  return (
    <div className="map-container">
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Lade Fotos...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <h2>Fehler</h2>
          <p>{error}</p>
          <button onClick={refreshPhotos}>Erneut versuchen</button>
          <div className="debug-info">
            <h3>Debug-Informationen</h3>
            <p>Pfad: {directoryInfo.currentPath}</p>
            <p>Standard-Verzeichnis: {directoryInfo.isDefault ? 'Ja' : 'Nein'}</p>
            <p>Pfad existiert: {directoryInfo.exists ? 'Ja' : 'Nein'}</p>
            <p>Ist Verzeichnis: {directoryInfo.isDirectory ? 'Ja' : 'Nein'}</p>
            <p>Electron verfügbar: {isElectronAvailable() ? 'Ja' : 'Nein'}</p>
            <p>Demo-Daten werden angezeigt: {isDemoData ? 'Ja' : 'Nein'}</p>
            <button className="debug-toggle-button" onClick={loadDirectoryContent}>
              Verzeichnisinhalt laden
            </button>
            <button className="debug-toggle-button" onClick={() => setShowDebug(!showDebug)}>
              Debug-Details {showDebug ? 'ausblenden' : 'anzeigen'}
            </button>
            {showDebug && debugInfo && (
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            )}
            {showDebug && serverStatus && (
              <div>
                <h4>Server-Status:</h4>
                <pre>{JSON.stringify(serverStatus, null, 2)}</pre>
              </div>
            )}
            {showDebug && directoryContent && (
              <div>
                <h4>Verzeichnisinhalt:</h4>
                <pre>{JSON.stringify(directoryContent, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="directory-info">
            <span className="directory-path">
              Aktuelles Verzeichnis: {directoryInfo.currentPath || 'Nicht ausgewählt'}
              {directoryInfo.isDefault && ' (Standard)'}
            </span>
            <button className="select-directory-button" onClick={handleSelectDirectory}>
              Verzeichnis auswählen
            </button>
            <button className="refresh-button" onClick={refreshPhotos}>
              Aktualisieren
            </button>
          </div>
          
          {isDemoData && (
            <div className="demo-data-warning">
              Achtung: Es werden Demo-Daten angezeigt! Bitte wählen Sie einen Ordner mit Bildern, die GPS-Daten enthalten.
            </div>
          )}
          
          <div className="photo-counter">
            {photos.filter(p => p.latitude && p.longitude).length} Fotos mit GPS-Daten gefunden
          </div>
          
          <button className="debug-toggle-button" onClick={() => setShowDebug(!showDebug)}>
            Debug-Infos {showDebug ? 'ausblenden' : 'anzeigen'}
          </button>
          
          {showDebug && (
            <div className="debug-panel">
              <h3>Debug-Informationen</h3>
              <p>Electron verfügbar: {isElectronAvailable() ? 'Ja' : 'Nein'}</p>
              <p>Pfad: {directoryInfo.currentPath}</p>
              <p>Standard-Verzeichnis: {directoryInfo.isDefault ? 'Ja' : 'Nein'}</p>
              <p>Pfad existiert: {directoryInfo.exists ? 'Ja' : 'Nein'}</p>
              <p>Ist Verzeichnis: {directoryInfo.isDirectory ? 'Ja' : 'Nein'}</p>
              <p>Demo-Daten werden angezeigt: {isDemoData ? 'Ja' : 'Nein'}</p>
              <button className="debug-toggle-button" onClick={loadDirectoryContent}>
                Verzeichnisinhalt laden
              </button>
              {debugInfo && (
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              )}
              {serverStatus && (
                <div>
                  <h4>Server-Status:</h4>
                  <pre>{JSON.stringify(serverStatus, null, 2)}</pre>
                </div>
              )}
              {directoryContent && (
                <div>
                  <h4>Verzeichnisinhalt:</h4>
                  <pre>{JSON.stringify(directoryContent, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
          
          <MapContainer 
            key={mapKey}
            center={getMapCenter()} 
            zoom={6} 
            style={{ height: "calc(100vh - 150px)", width: "100%" }}
            ref={mapRef}
          >
            <ChangeMapLayer 
              activeMapType={activeMapType} 
              setActiveMapType={setActiveMapType} 
            />
            
            <MarkerClusterGroup>
              {photos
                .filter(photo => photo.latitude && photo.longitude)
                .map((photo, index) => (
                  <Marker 
                    key={`${photo.filename}-${index}`}
                    position={[photo.latitude, photo.longitude]}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h3>{photo.filename}</h3>
                        <div className="popup-image-container">
                          <img 
                            src={`http://localhost:3001${photo.path}`} 
                            alt={photo.filename}
                            className="clickable-image"
                            onClick={() => openFullscreen(`http://localhost:3001${photo.path}`)}
                            onError={(e) => {
                              console.error(`Fehler beim Laden des Bildes: ${photo.path}`);
                              e.target.src = "https://via.placeholder.com/150x150?text=Bild+nicht+gefunden";
                              e.target.style.width = "150px";
                              e.target.style.height = "150px";
                            }}
                          />
                        </div>
                        <div className="popup-info">
                          <p>Koordinaten: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}</p>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
            </MarkerClusterGroup>
          </MapContainer>
          
          {fullscreenImage && (
            <div className="fullscreen-container" onClick={closeFullscreen}>
              <button className="close-button" onClick={closeFullscreen}>×</button>
              <img src={fullscreenImage} alt="Vergrößerte Ansicht" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default LeafletMap; 