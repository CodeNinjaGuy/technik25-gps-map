import React from "react";
import { useState, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";
import './PhotoMap.css';

const containerStyle = { width: "100%", height: "100%" };
// Angepasster Startpunkt basierend auf den GPS-Daten der Fotos (Berlin-Region)
const center = { lat: 52.967, lng: 13.988 };

// Google Maps API-Schlüssel
// WICHTIG: Sie müssen die Maps JavaScript API für diesen Schlüssel aktivieren:
// 1. Besuchen Sie https://console.cloud.google.com/
// 2. Wählen Sie Ihr Projekt aus
// 3. Gehen Sie zu "APIs & Dienste" > "Bibliothek"
// 4. Suchen Sie nach "Maps JavaScript API" und aktivieren Sie sie
const GOOGLE_MAPS_API_KEY = "AIzaSyB1_AYT1FxHZESE2qpvGS0NawCXHl91BLA";

function PhotoMap() {
  const { isLoaded, loadError } = useLoadScript({ 
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    onError: (error) => {
      console.error("Google Maps Fehler:", error);
      setDebugInfo(prev => ({ ...prev, mapsError: error.message }));
    }
  });
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({ status: "Initialisierung..." });

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

  if (loadError) return <div className="error-message">Fehler beim Laden der Google Maps API: {loadError.message}</div>;
  if (!isLoaded) return <div className="loading-message">Lade Karten...</div>;

  return (
    <div>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
        {photos.map(photo => (
          <Marker 
            key={photo.image_url} 
            position={{ lat: photo.latitude, lng: photo.longitude }}
            onClick={() => setSelectedPhoto(photo)}
          />
        ))}

        {selectedPhoto && (
          <InfoWindow
            position={{ lat: selectedPhoto.latitude, lng: selectedPhoto.longitude }}
            onCloseClick={() => setSelectedPhoto(null)}
          >
            <div className="photo-info">
              <img src={`http://127.0.0.1:8000${selectedPhoto.image_url}`} alt="Foto" width="200" />
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Debug-Informationen */}
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
    </div>
  );
}

export default PhotoMap;