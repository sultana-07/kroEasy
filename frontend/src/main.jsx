import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Workbox SW for PWA caching/offline support.
// We only send SKIP_WAITING — no forced reload — to avoid reload loops.
// Firebase Messaging SW (firebase-messaging-sw.js) is auto-registered by Firebase
// SDK internally when getToken() is called; no need to register it manually here.
registerSW({
  onNeedRefresh() {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  },
  onOfflineReady() {
    console.log('KroEasy is ready to work offline 🚀');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
