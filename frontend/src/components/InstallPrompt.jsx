import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as PWA → hide
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('install_dismissed')) return;

    // iOS Safari detection
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);
    if (ios) { setShowPrompt(true); return; }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('install_dismissed', '1');
    setDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div style={{
      margin: '0 16px 20px',
      borderRadius: '18px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(249,115,22,0.25)',
      position: 'relative',
    }}>
      {/* Attention ring animation */}
      <style>{`
        @keyframes install-pulse {
          0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.5); }
          70% { box-shadow: 0 0 0 14px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        @keyframes install-bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .install-icon { animation: install-bounce 2s ease-in-out infinite; }
        .install-btn { animation: install-pulse 2s infinite; }
      `}</style>

      {/* Header gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
        padding: '16px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div className="install-icon" style={{ fontSize: '38px', flexShrink: 0 }}>📲</div>
        <div style={{ flex: 1, color: 'white' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '2px' }}>
            Install KroEasy App — Free!
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Works offline • Opens instantly • No App Store!
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}
        >✕</button>
      </div>

      {/* Benefits + CTA */}
      <div style={{ background: '#FFF7ED', padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { icon: '⚡', text: 'Instant launch' },
            { icon: '📴', text: 'Works offline' },
            { icon: '🔔', text: 'Quick notifications' },
            { icon: '🏠', text: 'Home screen icon' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#7C2D12' }}>
              <span>{b.icon}</span> {b.text}
            </div>
          ))}
        </div>

        {isIOS ? (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#92400E', lineHeight: '1.6' }}>
            <strong>📱 iPhone users:</strong> Tap the <strong>Share ⬆</strong> button in Safari, then select <strong>"Add to Home Screen"</strong> to install KroEasy.
          </div>
        ) : (
          <button
            className="install-btn"
            onClick={handleInstall}
            style={{
              width: '100%', padding: '13px', fontSize: '15px', fontWeight: '800',
              background: 'linear-gradient(135deg, #F97316, #EA580C)',
              border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📲 Install KroEasy App Now
          </button>
        )}
      </div>
    </div>
  );
}
