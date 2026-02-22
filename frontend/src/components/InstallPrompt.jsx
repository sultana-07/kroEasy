import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
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

  if (!showPrompt) return null;

  return (
    <div style={{
      margin: '0 16px 16px',
      padding: '16px',
      background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
      borderRadius: '14px',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      boxShadow: '0 4px 20px rgba(30, 58, 138, 0.3)',
    }}>
      <div style={{ fontSize: '32px' }}>📱</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>Install KroEasy App</div>
        <div style={{ fontSize: '12px', opacity: 0.85 }}>Add to home screen for quick access</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          id="install-btn"
          onClick={handleInstall}
          style={{ padding: '8px 14px', background: '#F97316', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          style={{ padding: '4px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: 'pointer' }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
