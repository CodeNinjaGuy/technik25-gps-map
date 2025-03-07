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

function LeafletMap() {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({ status: "Initialisierung..." });
  const [showDebug, setShowDebug] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Angepasster Startpunkt basierend auf den GPS-Daten der Fotos (Berlin-Region)
  const center = [52.967, 13.988];

  useEffect(() => {
    setDebugInfo({ status: "Starte Fetch-Anfrage..." });
    
    // Verwende einen Timeout, um sicherzustellen, dass der Server Zeit hat zu starten
    setTimeout(() => {
      fetch("http://127.0.0.1:8000/photos")
        .then(res => {
          setDebugInfo(prev => ({ ...prev, status: "Antwort erhalten", statusCode: res.status }));
          if (!res.ok) {
            throw new Error(`HTTP-Fehler: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setDebugInfo(prev => ({ 
            ...prev, 
            status: "Daten verarbeitet", 
            photoCount: data.length,
            firstPhoto: data.length > 0 ? data[0] : null
          }));
          setPhotos(data);
        })
        .catch(err => {
          console.error("Fetch-Fehler:", err);
          setDebugInfo(prev => ({ ...prev, status: "Fehler", error: err.message }));
          setError(err.message);
        });
    }, 1000); // 1 Sekunde warten
  }, []);

  // Funktion zum Öffnen des Bildes im Vollbildmodus
  const openFullscreen = (imageUrl) => {
    setFullscreenImage(imageUrl);
  };

  // Funktion zum Schließen des Vollbildmodus
  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  // Tastaturereignisse für den Vollbildmodus
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && fullscreenImage) {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreenImage]);

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={14} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {photos.map(photo => (
          <Marker 
            key={photo.image_url} 
            position={[photo.latitude, photo.longitude]}
            eventHandlers={{
              click: () => setSelectedPhoto(photo)
            }}
          >
            {selectedPhoto && selectedPhoto.image_url === photo.image_url && (
              <Popup onClose={() => setSelectedPhoto(null)}>
                <div className="photo-info">
                  <img 
                    src={`http://127.0.0.1:8000${photo.image_url}`} 
                    alt="Foto" 
                    width="200" 
                    onClick={() => openFullscreen(`http://127.0.0.1:8000${photo.image_url}`)}
                    className="clickable-image"
                  />
                  <div className="photo-controls">
                    <button onClick={() => openFullscreen(`http://127.0.0.1:8000${photo.image_url}`)}>
                      Vollbild
                    </button>
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
      
      {/* Debug-Button */}
      <button 
        className="debug-toggle-button" 
        onClick={() => setShowDebug(!showDebug)}
      >
        {showDebug ? "Debug ausblenden" : "Debug anzeigen"}
      </button>
      
      {/* Debug-Informationen */}
      {showDebug && (
        <div className="debug-panel">
          <h3>Debug-Info:</h3>
          <p>Status: {debugInfo.status}</p>
          {debugInfo.statusCode && <p>Status-Code: {debugInfo.statusCode}</p>}
          {debugInfo.photoCount !== undefined && <p>Anzahl Fotos: {debugInfo.photoCount}</p>}
          {debugInfo.firstPhoto && (
            <div>
              <p>Erstes Foto:</p>
              <pre>{JSON.stringify(debugInfo.firstPhoto, null, 2)}</pre>
            </div>
          )}
          {error && <p style={{ color: "red" }}>Fehler: {error}</p>}
        </div>
      )}

      {/* Vollbild-Ansicht */}
      {fullscreenImage && (
        <div className="fullscreen-overlay" onClick={closeFullscreen}>
          <div className="fullscreen-container">
            <img 
              src={fullscreenImage} 
              alt="Vollbild" 
              className="fullscreen-image" 
            />
            <button className="fullscreen-close" onClick={closeFullscreen}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeafletMap; 