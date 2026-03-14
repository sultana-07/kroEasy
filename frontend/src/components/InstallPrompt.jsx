import { useState, useEffect } from 'react';
import api from '../api';

/* ─── Detect browser / OS ───────────────────────────────────────────────── */
function getInstallInfo() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSamsungBrowser = /samsungbrowser/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isOpera = /opr\//i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isChrome = /chrome/i.test(ua) && !isEdge && !isOpera && !isSamsungBrowser;
  const isAndroid = /android/i.test(ua);

  if (isIOS) return { type: 'ios' };
  if (isSamsungBrowser && isAndroid) return { type: 'samsung' };
  if (isFirefox && isAndroid) return { type: 'firefox-android' };
  if ((isChrome || isEdge || isOpera) && isAndroid) return { type: 'android-chrome' };
  if (isChrome || isEdge) return { type: 'desktop-chrome' };
  return { type: 'generic' };
}

/* ─── Steps for each platform ───────────────────────────────────────────── */
const STEPS = {
  ios: [
    { icon: '🌐', text: 'Open kroeasy.com in Safari browser' },
    { icon: '📤', text: 'Tap the Share button (box with arrow up)' },
    { icon: '🏠', text: 'Tap "Add to Home Screen"' },
    { icon: '✅', text: 'Tap "Add" — done!' },
  ],
  samsung: [
    { icon: '🌐', text: 'Open kroeasy.com in Samsung Internet' },
    { icon: '⋮', text: 'Tap the 3-dot menu at the bottom' },
    { icon: '➕', text: 'Tap "Add page to" → "Home screen"' },
    { icon: '✅', text: 'Tap "Add" — done!' },
  ],
  'firefox-android': [
    { icon: '🌐', text: 'Open kroeasy.com in Firefox' },
    { icon: '⋮', text: 'Tap the 3-dot menu' },
    { icon: '🏠', text: 'Tap "Install" or "Add to Home screen"' },
    { icon: '✅', text: 'Confirm — done!' },
  ],
  'desktop-chrome': [
    { icon: '🌐', text: 'See the install icon in the address bar (⊕)' },
    { icon: '🖱️', text: 'Click it and press "Install"' },
    { icon: '✅', text: 'App installs on your desktop!' },
  ],
  generic: [
    { icon: '🌐', text: 'Open kroeasy.com in Chrome browser' },
    { icon: '⋮', text: 'Tap the 3-dot menu' },
    { icon: '🏠', text: 'Tap "Add to Home screen" or "Install app"' },
    { icon: '✅', text: 'Confirm — done!' },
  ],
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [waiting, setWaiting] = useState(false);       // waiting for Chrome's event
  const [neverFired, setNeverFired] = useState(false); // Chrome event never came
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('install_dismissed')
  );
  const [installInfo] = useState(() => getInstallInfo());

  // Is this a Chrome-family browser that CAN receive beforeinstallprompt?
  const isChromeLike = ['android-chrome', 'desktop-chrome'].includes(installInfo.type);

  useEffect(() => {
    // Already installed as PWA — hide
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault(); // MUST call this to keep the event for manual triggering
      setDeferredPrompt(e);
      setWaiting(false);
      setNeverFired(false);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      api.post('/pwa/install', { platform: installInfo.type }).catch(() => {});
      setDismissed(true);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (installing) return;

    // Chrome: native prompt already captured → fire it immediately
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setInstalling(false);
      setDeferredPrompt(null);
      if (outcome === 'accepted') setDismissed(true);
      return;
    }

    // Chrome: prompt not yet received → wait up to 8 seconds
    if (isChromeLike && !neverFired) {
      setWaiting(true);
      let resolved = false;
      const waitForPrompt = new Promise((resolve) => {
        const check = (e) => {
          e.preventDefault();
          setDeferredPrompt(e);
          setWaiting(false);
          resolved = true;
          // Auto-trigger immediately
          e.prompt();
          e.userChoice.then(({ outcome }) => {
            if (outcome === 'accepted') setDismissed(true);
          });
          resolve();
          window.removeEventListener('beforeinstallprompt', check);
        };
        window.addEventListener('beforeinstallprompt', check);
        // Timeout after 8s
        setTimeout(() => {
          if (!resolved) {
            setWaiting(false);
            setNeverFired(true);
            window.removeEventListener('beforeinstallprompt', check);
            resolve();
          }
        }, 8000);
      });
      await waitForPrompt;
      return;
    }

    // All other browsers (or Chrome that never fired) → show step-by-step guide
    setShowGuide(true);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('install_dismissed', '1');
    setDismissed(true);
  };

  if (dismissed) return null;

  const steps = STEPS[installInfo.type] || STEPS.generic;


  return (
    <div style={{ margin: '0 16px 20px', borderRadius: '16px', overflow: 'hidden',
      border: '1px solid #E0E7FF', boxShadow: '0 4px 20px rgba(79,70,229,.12)',
      background: 'white', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#4F46E5,#6366F1)', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '28px', flexShrink: 0 }}>📲</span>
        <div style={{ flex: 1, color: 'white' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', marginBottom: '1px' }}>
            Install KroEasy — Free!
          </div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>
            Home screen icon · Fast · Works offline
          </div>
        </div>
        <button onClick={handleDismiss}
          style={{ background: 'rgba(255,255,255,.2)', border: 'none', color: 'white',
            width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer',
            fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontWeight: '700' }}>
          ✕
        </button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {!showGuide ? (
          <>
            {/* Benefits row */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[['⚡','Fast launch'], ['📴','Works offline'], ['🏠','Home screen'], ['🔔','Alerts']].map(([ic, tx]) => (
                <div key={tx} style={{ display:'flex', alignItems:'center', gap:'4px',
                  background:'#F0F4FF', borderRadius:'20px', padding:'4px 10px',
                  fontSize:'11px', fontWeight:'600', color:'#3730A3' }}>
                  <span>{ic}</span><span>{tx}</span>
                </div>
              ))}
            </div>

            {/* Install button — ALWAYS clickable */}
            <button
              onClick={handleInstall}
              disabled={waiting}
              style={{
                width: '100%', padding: '13px', fontSize: '15px', fontWeight: '800',
                background: waiting
                  ? 'linear-gradient(135deg,#94A3B8,#64748B)'
                  : 'linear-gradient(135deg,#4F46E5,#6366F1)',
                border: 'none', borderRadius: '12px', color: 'white',
                cursor: waiting ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px',
                transition: 'background .2s',
              }}>
              {installing
                ? '⏳ Installing…'
                : waiting
                  ? '⏳ Preparing install…'
                  : '📲 Install App — Free!'}
            </button>

            {/* Hint below button */}
            {!deferredPrompt && !waiting && !isChromeLike && (
              <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '8px' }}>
                {installInfo.type === 'ios'
                  ? '🍎 Open in Safari for best experience'
                  : 'Tap above for step‑by‑step install guide'}
              </div>
            )}
            {neverFired && isChromeLike && (
              <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '8px' }}>
                Look for the ⊕ icon in your browser address bar to install
              </div>
            )}
          </>
        ) : (
          /* Step-by-step guide */
          <>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              📋 Follow these steps:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%',
                    background: '#EEF2FF', color: '#4F46E5', fontSize: '11px', fontWeight: '800',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: '500', lineHeight: 1.5 }}>
                    <span style={{ marginRight: '5px' }}>{s.icon}</span>{s.text}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowGuide(false)}
              style={{ width: '100%', padding: '10px', background: '#F1F5F9',
                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
                color: '#475569', cursor: 'pointer' }}>
              ← Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
