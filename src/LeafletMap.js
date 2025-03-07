import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import MarkerClusterGroup from 'react-leaflet-markercluster';
import "leaflet/dist/leaflet.css";
import 'react-leaflet-markercluster/dist/styles.min.css';
import L from "leaflet";
import './LeafletMap.css';

// Korrigiere das Icon-Problem in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png"
});

// Komponente zum Ändern des Kartentyps
function ChangeMapLayer({ mapType }) {
  const map = useMap();
  
  // Karten-Layer-Definitionen
  const layers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    topo: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    }
  };
  
  useEffect(() => {
    // Entferne alle vorhandenen Tile-Layer
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });
    
    // Füge den ausgewählten Layer hinzu
    L.tileLayer(layers[mapType].url, {
      attribution: layers[mapType].attribution
    }).addTo(map);
  }, [map, mapType]);
  
  return null;
}

function LeafletMap() {
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({ status: "Initialisierung..." });
  const [showDebug, setShowDebug] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState("osm"); // Standard-Kartentyp

  // Angepasster Startpunkt basierend auf den GPS-Daten der Fotos (Berlin-Region)
  const center = [52.967, 13.988];

  // Funktion zum Ändern des Kartentyps
  const handleMapTypeChange = (type) => {
    setMapType(type);
  };

  useEffect(() => {
    setDebugInfo({ status: "Starte Fetch-Anfrage..." });
    setLoading(true);
    
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
          setLoading(false);
        })
        .catch(err => {
          console.error("Fetch-Fehler:", err);
          setDebugInfo(prev => ({ ...prev, status: "Fehler", error: err.message }));
          setError(err.message);
          setLoading(false);
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

  if (loading) {
    return <div className="loading-screen">Lade Fotos und Karte...</div>;
  }

  return (
    <div className="map-container">
      <MapContainer 
        center={center} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
        zoomControl={false} // Deaktiviere die Standard-Zoom-Steuerung
      >
        {/* Zoom-Steuerung in der oberen rechten Ecke */}
        <ZoomControl position="topright" />
        
        {/* Kartentyp-Wechsler */}
        <ChangeMapLayer mapType={mapType} />
        
        <MarkerClusterGroup>
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
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Manuelle Kartentyp-Auswahl */}
      <div className="map-type-selector">
        <button 
          className={`map-type-button ${mapType === 'osm' ? 'active' : ''}`} 
          onClick={() => handleMapTypeChange('osm')}
        >
          Straßenkarte
        </button>
        <button 
          className={`map-type-button ${mapType === 'satellite' ? 'active' : ''}`} 
          onClick={() => handleMapTypeChange('satellite')}
        >
          Satellit
        </button>
        <button 
          className={`map-type-button ${mapType === 'topo' ? 'active' : ''}`} 
          onClick={() => handleMapTypeChange('topo')}
        >
          Topographisch
        </button>
      </div>
      
      {/* Foto-Zähler */}
      <div className="photo-counter">
        {photos.length} Fotos geladen
      </div>
      
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
          <p>Kartentyp: {mapType}</p>
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