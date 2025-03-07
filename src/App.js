import React from "react";
import LeafletMap from "./LeafletMap";
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>GPS Foto Map</h1>
        <p>Ihre Fotos auf der Karte visualisiert</p>
      </header>
      <main className="app-content">
        <LeafletMap />
      </main>
    </div>
  );
}

export default App; 