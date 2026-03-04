import { useState, useEffect } from 'react';
import api from '../api';

/**
 * InstallPrompt — shows a PWA install banner with a single button.
 *
 * - Always shows the button (unless already in standalone/PWA mode or dismissed).
 * - If browserinstallprompt is ready → one-tap native install on click.
 * - Otherwise → a small toast-style tip appears briefly instead of text.
 * - Records the install to the backend on success.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [tip, setTip] = useState('');

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('install_dismissed')) return;

    setShow(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onInstalled = () => {
      recordInstall();
      setShow(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const recordInstall = () => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const android = /android/i.test(navigator.userAgent);
    const platform = ios ? 'ios' : android ? 'android' : 'desktop';
    api.post('/pwa/install', { platform }).catch(() => {});
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome/Android: native prompt available
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        recordInstall();
        setShow(false);
      }
    } else {
      // Fallback: show a brief tip message
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const msg = ios
        ? '📱 Safari → Share ⬆ → "Add to Home Screen"'
        : '🤖 Browser menu (⋮) → "Add to Home Screen" / "Install App"';
      setTip(msg);
      setTimeout(() => setTip(''), 4000);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('install_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      margin: '0 16px 20px',
      borderRadius: '18px',
      overflow: 'visible',
      boxShadow: '0 8px 32px rgba(249,115,22,0.25)',
      position: 'relative',
    }}>
      <style>{`
        @keyframes install-pulse {
          0%   { box-shadow: 0 0 0 0   rgba(249,115,22,0.5); }
          70%  { box-shadow: 0 0 0 14px rgba(249,115,22,0);  }
          100% { box-shadow: 0 0 0 0   rgba(249,115,22,0);   }
        }
        @keyframes install-bounce {
          0%,100% { transform: translateY(0);   }
          50%     { transform: translateY(-4px); }
        }
        @keyframes ip-tip-in {
          from { opacity:0; transform: translateY(6px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .ip-icon { animation: install-bounce 2s ease-in-out infinite; display:inline-block; }
        .ip-btn  { animation: install-pulse  2s infinite; }
      `}</style>

      {/* ── Tip toast ── */}
      {tip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0,
          background: '#1E293B', color: 'white', borderRadius: '12px',
          padding: '12px 14px', fontSize: '13px', fontWeight: '600',
          lineHeight: '1.5', zIndex: 100, animation: 'ip-tip-in 0.25s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          {tip}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#F97316,#EA580C)',
        padding: '16px',
        borderRadius: '18px 18px 0 0',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <span className="ip-icon" style={{ fontSize: '36px', flexShrink: 0 }}>📲</span>
        <div style={{ flex: 1, color: 'white' }}>
          <div style={{ fontSize: '15px', fontWeight: '800', marginBottom: '2px' }}>
            Install KroEasy App — Free!
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9 }}>
            Works offline • Home screen icon • No App Store needed
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
            width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer',
            fontSize: '14px', flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: '700',
          }}
        >✕</button>
      </div>

      {/* ── Body ── */}
      <div style={{ background: '#FFF7ED', padding: '14px 16px', borderRadius: '0 0 18px 18px' }}>
        {/* Feature pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {[
            { icon: '⚡', text: 'Instant launch' },
            { icon: '📴', text: 'Works offline'  },
            { icon: '🔔', text: 'Notifications'  },
            { icon: '🏠', text: 'Home screen icon'},
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', fontWeight: '600', color: '#7C2D12',
            }}>
              <span>{b.icon}</span> {b.text}
            </div>
          ))}
        </div>

        {/* Single install button — always shown */}
        <button
          className="ip-btn"
          onClick={handleInstall}
          style={{
            width: '100%', padding: '13px', fontSize: '15px', fontWeight: '800',
            background: 'linear-gradient(135deg,#F97316,#EA580C)',
            border: 'none', borderRadius: '12px', color: 'white',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          📲 Install KroEasy App
        </button>
      </div>
    </div>
  );
}
