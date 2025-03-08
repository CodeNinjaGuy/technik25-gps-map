import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Funktion zum Initialisieren der App
function initializeApp() {
  try {
    console.log('Initialisiere App...');
    const rootElement = document.getElementById('root');
    
    if (!rootElement) {
      console.error('Root-Element nicht gefunden!');
      return;
    }
    
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('App erfolgreich initialisiert.');
  } catch (error) {
    console.error('Fehler beim Initialisieren der App:', error);
    
    // Versuche es nach einer kurzen Verzögerung erneut
    setTimeout(() => {
      console.log('Versuche erneut zu initialisieren...');
      initializeApp();
    }, 1000);
  }
}

// Starte die App
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM geladen, starte App...');
  initializeApp();
});

// Falls DOMContentLoaded bereits ausgelöst wurde
if (document.readyState === 'interactive' || document.readyState === 'complete') {
  console.log('DOM bereits geladen, starte App...');
  initializeApp();
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 