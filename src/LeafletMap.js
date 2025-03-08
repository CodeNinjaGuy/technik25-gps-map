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
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    },
    topo: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    }
  };
  
  useEffect(() => {
    console.log("Kartentyp geändert zu:", mapType);
    
    try {
      // Entferne alle vorhandenen TileLayer
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });
      
      // Füge den ausgewählten TileLayer hinzu
      const selectedLayer = layers[mapType] || layers.osm;
      L.tileLayer(selectedLayer.url, {
        attribution: selectedLayer.attribution
      }).addTo(map);
    } catch (error) {
      console.error("Fehler beim Ändern des Kartentyps:", error);
    }
  }, [map, mapType]);
  
  return null;
}

function LeafletMap() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [mapType, setMapType] = useState("osm");
  const [debugInfo, setDebugInfo] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapRef = useRef(null);
  
  // Lade die Fotos vom Server
  useEffect(() => {
    console.log("Lade Fotos vom Server...");
    setLoading(true);
    
    // Bestimme die API-URL basierend auf der Umgebung
    const apiUrl = process.env.NODE_ENV === 'production' 
      ? 'http://localhost:3001/api/photos'
      : 'http://localhost:3001/api/photos';
    
    console.log("API-URL:", apiUrl);
    
    // Prüfe zuerst, ob der Server läuft
    fetch('http://localhost:3001/api/status')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server-Status-Fehler: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(statusData => {
        console.log("Server-Status:", statusData);
        
        // Wenn der Server läuft, lade die Fotos
        return fetch(apiUrl);
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server-Fehler: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        console.log(`${data.length} Fotos geladen`);
        setPhotos(data);
        setLoading(false);
        setMapInitialized(true);
      })
      .catch(err => {
        console.error("Fehler beim Laden der Fotos:", err);
        setError(err.message);
        setLoading(false);
        
        // Setze Beispieldaten, damit die Karte trotzdem angezeigt wird
        setPhotos([{
          filename: 'beispiel.jpg',
          path: '/images/beispiel.jpg',
          latitude: 51.1657,
          longitude: 10.4515
        }]);
        setMapInitialized(true);
      });
  }, []);
  
  const handleMapTypeChange = (type) => {
    console.log("Wechsle zu Kartentyp:", type);
    setMapType(type);
  };
  
  const toggleDebugInfo = () => {
    setDebugInfo(!debugInfo);
  };
  
  // Berechne den Mittelpunkt der Karte basierend auf den Fotos
  const getMapCenter = () => {
    if (photos.length === 0) {
      return [51.1657, 10.4515]; // Deutschland-Mitte als Fallback
    }
    
    const latSum = photos.reduce((sum, photo) => sum + photo.latitude, 0);
    const lngSum = photos.reduce((sum, photo) => sum + photo.longitude, 0);
    
    return [latSum / photos.length, lngSum / photos.length];
  };
  
  const openFullscreen = (imageUrl) => {
    setSelectedPhoto(imageUrl);
    setFullscreen(true);
  };
  
  const closeFullscreen = () => {
    setFullscreen(false);
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && fullscreen) {
        closeFullscreen();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreen]);
  
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Lade Fotos...</p>
      </div>
    );
  }
  
  if (error && !mapInitialized) {
    return (
      <div className="error-container">
        <h2>Fehler beim Laden der Fotos</h2>
        <p>{error}</p>
        <div className="debug-info">
          <h3>Debug-Informationen:</h3>
          <p>Umgebung: {process.env.NODE_ENV}</p>
          <p>API-URL: {process.env.NODE_ENV === 'production' ? 'http://localhost:3001/api/photos' : 'http://localhost:3001/api/photos'}</p>
          <button onClick={() => window.location.reload()}>Erneut versuchen</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="map-container">
      {fullscreen && (
        <div className="fullscreen-container" onClick={closeFullscreen}>
          <img src={selectedPhoto} alt="Vollbild" />
          <button className="close-button" onClick={closeFullscreen}>
            Schließen
          </button>
        </div>
      )}
      
      <div className="map-type-selector">
        <button
          className={mapType === "osm" ? "active" : ""}
          onClick={() => handleMapTypeChange("osm")}
        >
          OpenStreetMap
        </button>
        <button
          className={mapType === "satellite" ? "active" : ""}
          onClick={() => handleMapTypeChange("satellite")}
        >
          Satellit
        </button>
        <button
          className={mapType === "topo" ? "active" : ""}
          onClick={() => handleMapTypeChange("topo")}
        >
          Topographisch
        </button>
      </div>
      
      <div className="photo-counter">
        <span>{photos.length} Fotos</span>
      </div>
      
      <MapContainer
        key={mapInitialized ? "initialized" : "loading"}
        center={getMapCenter()}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        ref={mapRef}
      >
        <ChangeMapLayer mapType={mapType} />
        <ZoomControl position="bottomright" />
        
        <MarkerClusterGroup>
          {photos.map((photo, index) => (
            <Marker
              key={index}
              position={[photo.latitude, photo.longitude]}
            >
              <Popup>
                <div className="popup-content">
                  <img
                    src={photo.path}
                    alt={photo.filename}
                    onClick={() => openFullscreen(photo.path)}
                    onError={(e) => {
                      console.error(`Fehler beim Laden des Bildes: ${photo.path}`);
                      e.target.src = "https://via.placeholder.com/200x150?text=Bild+nicht+verfügbar";
                    }}
                  />
                  <div className="popup-info">
                    <p>{photo.filename}</p>
                    <button onClick={() => openFullscreen(photo.path)}>
                      Vollbild
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
      
      <button className="debug-button" onClick={toggleDebugInfo}>
        {debugInfo ? "Debug ausblenden" : "Debug anzeigen"}
      </button>
      
      {debugInfo && (
        <div className="debug-panel">
          <h3>Debug-Informationen</h3>
          <p>Umgebung: {process.env.NODE_ENV}</p>
          <p>Kartentyp: {mapType}</p>
          <p>Anzahl Fotos: {photos.length}</p>
          <p>Kartenmittelpunkt: {getMapCenter().join(", ")}</p>
          <p>Fehler: {error ? error : "Keiner"}</p>
          <p>Map initialisiert: {mapInitialized ? "Ja" : "Nein"}</p>
          <h4>Foto-Daten:</h4>
          <pre>{JSON.stringify(photos.slice(0, 2), null, 2)}...</pre>
        </div>
      )}
    </div>
  );
}

export default LeafletMap; 