import { useState, useEffect } from 'react';
import api from '../api';

/**
 * InstallPrompt — shows a PWA install banner.
 *
 * Behaviour:
 *  • Always shows (unless already in standalone/PWA mode).
 *  • If beforeinstallprompt fires (Chrome/Edge/Android) → one-tap install button.
 *  • Otherwise → manual "Add to Home Screen" instructions for both Android & iOS.
 *  • On successful install (appinstalled event) → logs to backend + hides banner.
 *  • Dismiss (✕) hides for the session.
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already running as installed PWA — never show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Already dismissed this session
    if (sessionStorage.getItem('install_dismissed')) return;

    // Detect iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Always show the banner
    setShow(true);

    // Chrome / Edge / Android: capture the native install prompt if available
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Track installs via the browser appinstalled event
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
    // Fire and forget — don't block UI
    api.post('/pwa/install', { platform }).catch(() => {});
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        recordInstall();
        setShow(false);
      }
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
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(249,115,22,0.25)',
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
        .ip-icon { animation: install-bounce 2s ease-in-out infinite; display:inline-block; }
        .ip-btn  { animation: install-pulse  2s infinite; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#F97316,#EA580C)',
        padding: '16px',
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
      <div style={{ background: '#FFF7ED', padding: '14px 16px' }}>
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

        {/* CTA */}
        {deferredPrompt ? (
          /* Chrome/Android: one-tap native install */
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
        ) : isIOS ? (
          /* iOS Safari manual tip */
          <div style={{
            background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px',
            padding: '10px 12px', fontSize: '12px', color: '#92400E', lineHeight: '1.6',
          }}>
            📱 <strong>iPhone:</strong> Safari के <strong>Share ⬆</strong> button से{' '}
            <strong>"Add to Home Screen"</strong> चुनें।
          </div>
        ) : (
          /* Android/Desktop fallback — beforeinstallprompt not yet fired */
          <div style={{
            background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '10px',
            padding: '10px 12px', fontSize: '12px', color: '#92400E', lineHeight: '1.6',
          }}>
            🤖 <strong>Android Chrome:</strong> Browser menu (⋮) से{' '}
            <strong>"Add to Home Screen"</strong> या{' '}
            <strong>"Install App"</strong> चुनें।
          </div>
        )}
      </div>
    </div>
  );
}
