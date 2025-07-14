import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Force cache busting and service worker unregistration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Clear all caches
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide loading screen when React loads
const loading = document.getElementById('loading');
if (loading) {
  loading.style.display = 'none';
} 