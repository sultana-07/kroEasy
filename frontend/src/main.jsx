import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Auto-update PWA: when a new service worker is ready, activate it and reload.
// This ensures installed users always see the latest version without manual refresh.
registerSW({
  onNeedRefresh() {
    // New SW waiting — skip waiting so it activates immediately, then reload
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    // Reload after a brief moment to let SW activate
    setTimeout(() => window.location.reload(), 500);
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
