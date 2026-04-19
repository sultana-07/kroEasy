import { useState, useEffect } from 'react';
import api from '../api';

const STORAGE_KEY = 'kroeasy_city';
const LANG_KEY = 'kroeasy_lang';

export default function CityModal({ onCitySelected, forceOpen }) {
  const [open, setOpen] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  // Step 1 = language, Step 2 = city
  const [step, setStep] = useState(1);
  const [chosenLang, setChosenLang] = useState('');
  const [selected, setSelected] = useState('');
  const [locations, setLocations] = useState([]);
  const [loadingLocs, setLoadingLocs] = useState(false);

  // Determine which steps to show
  const needsLang = !localStorage.getItem(LANG_KEY);
  const needsCity = !localStorage.getItem(STORAGE_KEY);

  useEffect(() => {
    const fetchLocs = async () => {
        setLoadingLocs(true);
        try {
            const { data } = await api.get('/locations');
            setLocations(data);
        } catch (err) {
            console.error('Failed to fetch cities', err);
        } finally {
            setLoadingLocs(false);
        }
    };
    fetchLocs();
  }, []);

  useEffect(() => {
    if (forceOpen) {
      // Only show city step when manually re-opened
      setStep(2);
      setOpen(true);
      requestAnimationFrame(() => setAnimIn(true));
      return;
    }
    if (needsLang || needsCity) {
      setStep(needsLang ? 1 : 2);
      const t = setTimeout(() => {
        setOpen(true);
        requestAnimationFrame(() => setAnimIn(true));
      }, 450);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  const handleLangSelect = (lang) => {
    localStorage.setItem(LANG_KEY, lang);
    setChosenLang(lang);
    // Sync with the LanguageContext via storage event
    window.dispatchEvent(new StorageEvent('storage', { key: LANG_KEY, newValue: lang }));
    if (needsCity) {
      setStep(2);
    } else {
      closeModal();
    }
  };

  const handleCitySelect = (city) => {
    localStorage.setItem(STORAGE_KEY, city);
    setSelected(city);
    closeModal(city);
  };

  const closeModal = (city) => {
    setAnimIn(false);
    setTimeout(() => {
      setOpen(false);
      onCitySelected && onCitySelected(city || localStorage.getItem(STORAGE_KEY) || '');
    }, 260);
  };

  const isHi = chosenLang === 'hi' || (!chosenLang && localStorage.getItem(LANG_KEY) === 'hi');

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15,23,42,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
      padding: '16px',
      opacity: animIn ? 1 : 0,
      transition: 'opacity 0.26s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 22, padding: '28px 20px 22px',
        width: '100%', maxWidth: 360,
        boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
        transform: animIn ? 'scale(1) translateY(0)' : 'scale(0.93) translateY(18px)',
        transition: 'transform 0.26s cubic-bezier(.34,1.56,.64,1)',
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* Step indicator dots */}
        {!forceOpen && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                width: s === step ? 20 : 8, height: 8, borderRadius: 999,
                background: s === step ? '#4338ca' : '#e2e8f0',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        )}

        {/* ── STEP 1: Language ── */}
        {step === 1 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg,#4338ca,#7c3aed)',
                fontSize: 26, boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
              }}>🌐</div>
            </div>
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: 19, fontWeight: 900, color: '#0f172a', letterSpacing: -0.3 }}>
              भाषा चुनें / Choose Language
            </h2>
            <p style={{ margin: '8px 0 20px', textAlign: 'center', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              Select your preferred language
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { code: 'hi', flag: '🇮🇳', label: 'हिंदी', sub: 'Hindi' },
                { code: 'en', flag: '🌐', label: 'English', sub: 'English' },
              ].map(l => (
                <button
                  key={l.code}
                  onClick={() => handleLangSelect(l.code)}
                  style={{
                    padding: '16px 12px', borderRadius: 14, border: '2px solid #e2e8f0',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, background: '#f8fafc',
                    transition: 'all 0.18s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#4338ca'; e.currentTarget.style.background = '#eef2ff'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <span style={{ fontSize: 28 }}>{l.flag}</span>
                  <span style={{ fontSize: 15, color: '#0f172a' }}>{l.label}</span>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>{l.sub}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 2: City ── */}
        {step === 2 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg,#4338ca,#7c3aed)',
                fontSize: 26, boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
              }}>📍</div>
            </div>
            <h2 style={{ margin: 0, textAlign: 'center', fontSize: 19, fontWeight: 900, color: '#0f172a', letterSpacing: -0.3 }}>
              {isHi ? 'अपना शहर चुनें' : 'Choose Your City'}
            </h2>
            <p style={{ margin: '8px 0 20px', textAlign: 'center', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
              {isHi ? 'नज़दीकी workers और cars देखें' : 'See workers and cars near you'}
            </p>
            <div style={{ display: 'grid', gap: 10, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {loadingLocs ? (
                  <div style={{ textAlign: 'center', padding: 20, fontSize: 14, color: '#64748B' }}>Loading cities...</div>
              ) : locations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20, fontSize: 14, color: '#64748B' }}>No active cities found</div>
              ) : locations.map(loc => (
                <button
                  key={loc._id}
                  onClick={() => { setSelected(loc.city); handleCitySelect(loc.city); }}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: 13, border: '2px solid',
                    borderColor: selected === loc.city ? '#4338ca' : '#e2e8f0',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    fontSize: 14, textAlign: 'left', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between',
                    background: selected === loc.city ? 'linear-gradient(135deg,#4338ca,#7c3aed)' : '#f8fafc',
                    color: selected === loc.city ? '#fff' : '#1e293b',
                    boxShadow: selected === loc.city ? '0 4px 16px rgba(79,70,229,0.3)' : 'none',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      display: 'inline-flex', width: 30, height: 30, borderRadius: '50%',
                      alignItems: 'center', justifyContent: 'center',
                      background: selected === loc.city ? 'rgba(255,255,255,0.2)' : '#dbeafe',
                      fontSize: 15, flexShrink: 0,
                    }}>🏙️</span>
                    <span>
                      <div>{isHi ? (loc.nameHi || loc.city) : loc.city}</div>
                      {isHi && loc.nameHi && <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 500 }}>{loc.city}</div>}
                    </span>
                  </span>
                  <span style={{ fontSize: 16, opacity: 0.7 }}>→</span>
                </button>
              ))}
            </div>
            {/* Go back to language if not force-opened */}
            {!forceOpen && (
              <button onClick={() => setStep(1)} style={{
                marginTop: 14, width: '100%', background: 'none', border: 'none',
                color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>← {isHi ? 'भाषा बदलें' : 'Change Language'}</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export { STORAGE_KEY, LANG_KEY };
