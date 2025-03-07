import React from "react";
import LeafletMap from "./LeafletMap";
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Technik25 GPS Map</h1>
        <p>Ihre Fotos auf der Karte visualisiert</p>
      </header>
      <main className="app-content">
        <LeafletMap />
      </main>
      <footer className="app-footer">
        <p>Entwickelt von Martin Bundschuh &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;

