import { useState, useEffect } from 'react';
import api from '../api';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow]     = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('install_dismissed')) return;

    // Always show the banner
    setShow(true);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      api.post('/pwa/install', { platform: /android/i.test(navigator.userAgent) ? 'android' : 'desktop' }).catch(() => {});
      setShow(false);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setInstalling(false);
    if (outcome === 'accepted') setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{ margin: '0 16px 20px', borderRadius: '18px', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(249,115,22,0.22)' }}>
      <style>{`
        @keyframes ip-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes ip-glow   { 0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,.55)} 70%{box-shadow:0 0 0 16px rgba(249,115,22,0)} }
        .ip-icon { animation: ip-bounce 2s ease-in-out infinite; display:inline-block; }
        .ip-btn  { animation: ip-glow   2s infinite; }
        .ip-btn:active { transform:scale(.97); }
      `}</style>

      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#F97316,#EA580C)', padding:'16px',
        display:'flex', alignItems:'center', gap:'12px' }}>
        <span className="ip-icon" style={{ fontSize:'36px', flexShrink:0 }}>📲</span>
        <div style={{ flex:1, color:'white' }}>
          <div style={{ fontSize:'15px', fontWeight:'800', marginBottom:'2px' }}>Install KroEasy App — Free!</div>
          <div style={{ fontSize:'11px', opacity:.9 }}>Offline • Home screen icon • No App Store</div>
        </div>
        <button onClick={() => { sessionStorage.setItem('install_dismissed','1'); setShow(false); }}
          style={{ background:'rgba(255,255,255,.2)', border:'none', color:'white', width:'28px', height:'28px',
            borderRadius:'50%', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center',
            justifyContent:'center', fontWeight:'700' }}>✕</button>
      </div>

      {/* Body — just the install button */}
      <div style={{ background:'#FFF7ED', padding:'14px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'14px' }}>
          {[['⚡','Instant launch'],['📴','Works offline'],['🔔','Notifications'],['🏠','Home screen']].map(([icon,text],i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', fontWeight:'600', color:'#7C2D12' }}>
              <span>{icon}</span>{text}
            </div>
          ))}
        </div>

        <button
          className="ip-btn"
          onClick={handleInstall}
          style={{
            width:'100%', padding:'14px', fontSize:'16px', fontWeight:'800',
            background:'linear-gradient(135deg,#F97316,#EA580C)',
            border:'none', borderRadius:'14px', color:'white',
            cursor:'pointer', display:'flex', alignItems:'center',
            justifyContent:'center', gap:'8px', transition:'transform .15s',
          }}
        >
          {installing ? '⏳ Installing…' : '📲 Install KroEasy App'}
        </button>
      </div>
    </div>
  );
}
