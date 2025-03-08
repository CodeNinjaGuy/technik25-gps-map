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
  
  // Statischer Deutschland-Mittelpunkt
  const center = [51.1657, 10.4515];
  
  // Lade die Fotos vom Server
  useEffect(() => {
    const loadPhotos = async () => {
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
        }
      } catch (err) {
        console.error("Fehler beim Laden der Fotos:", err);
        setError(err.message);
        // Verwende Fallback-Daten, da bereits bei der Initialisierung gesetzt
      } finally {
        setLoading(false);
      }
    };
    
    loadPhotos();
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
                <p>Koordinaten: {photo.latitude}, {photo.longitude}</p>
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
    </div>
  );
}

export default LeafletMap; 