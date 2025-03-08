import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import './LeafletMap.css';

// Korrigiere das Icon-Problem in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
});

// Hartcodierte Daten als Fallback
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

function LeafletMap() {
  const [photos, setPhotos] = useState(FALLBACK_PHOTOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [directoryInfo, setDirectoryInfo] = useState({ currentPath: null, isDefault: true });
  
  // Statischer Deutschland-Mittelpunkt
  const center = [51.1657, 10.4515];
  
  // Laden der Verzeichnisinformationen
  const loadDirectoryInfo = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/directory-info');
      if (response.ok) {
        const data = await response.json();
        setDirectoryInfo(data);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Verzeichnisinformationen:", err);
    }
  };
  
  // Lade Fotos neu
  const refreshPhotos = async () => {
    setLoading(true);
    try {
      console.log("Versuche, Fotos vom Server zu laden...");
      const response = await fetch('http://localhost:3001/api/photos');
      if (!response.ok) {
        throw new Error(`Server-Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Geladene Fotos:", data);
      
      if (data && data.length > 0) {
        setPhotos(data);
      } else {
        console.log("Keine Fotos gefunden, verwende Fallback-Daten");
        setPhotos(FALLBACK_PHOTOS);
      }
      setError(null);
    } catch (err) {
      console.error("Fehler beim Laden der Fotos:", err);
      setError(err.message);
      setPhotos(FALLBACK_PHOTOS);
    } finally {
      setLoading(false);
    }
  };
  
  // Verzeichnis auswählen
  const handleSelectDirectory = () => {
    if (window.electron) {
      window.electron.send('select-directory');
    } else {
      // Fallback für Browser-Umgebung
      alert('Diese Funktion ist nur in der Desktop-App verfügbar.');
    }
  };
  
  // Höre auf Verzeichnisänderungen
  useEffect(() => {
    const handleDirectoryChange = (event, data) => {
      console.log('Verzeichnisänderung erkannt:', data);
      setDirectoryInfo({
        currentPath: data.path,
        isDefault: data.isDefault
      });
      refreshPhotos();
    };
    
    // Registriere Event-Listener für Verzeichnisänderungen
    if (window.electron) {
      window.electron.receive('directory-changed', handleDirectoryChange);
    }
    
    // Bereinige den Event-Listener
    return () => {
      if (window.electron) {
        window.electron.removeAllListeners('directory-changed');
      }
    };
  }, []);
  
  // Initialer Ladevorgang
  useEffect(() => {
    const initializeApp = async () => {
      await loadDirectoryInfo();
      await refreshPhotos();
    };
    
    initializeApp();
  }, []);
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Lade Karte...</p>
      </div>
    );
  }
  
  return (
    <div className="map-container">
      <div className="directory-info">
        <div className="directory-path">
          <span>Bildordner: {directoryInfo.isDefault ? "Standard" : directoryInfo.currentPath}</span>
        </div>
        <button className="select-directory-button" onClick={handleSelectDirectory}>
          Bildordner auswählen
        </button>
      </div>
      
      <div className="photo-counter">
        <span>{photos.length} Fotos</span>
      </div>
      
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {photos.map((photo, index) => (
          <Marker
            key={index}
            position={[photo.latitude, photo.longitude]}
          >
            <Popup>
              <div className="popup-content">
                <h3>{photo.filename}</h3>
                <p>Koordinaten: {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</p>
                <img 
                  src={photo.path} 
                  alt={photo.filename}
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/150x150?text=Bild+nicht+gefunden";
                    e.target.style.width = "150px";
                    e.target.style.height = "150px";
                  }}
                />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {error && (
        <div className="error-overlay">
          <p>Fehler: {error}</p>
          <p>Es werden Beispieldaten angezeigt.</p>
        </div>
      )}
      
      <div className="app-footer">
        <button className="refresh-button" onClick={refreshPhotos}>
          Aktualisieren
        </button>
      </div>
    </div>
  );
}

export default LeafletMap; 