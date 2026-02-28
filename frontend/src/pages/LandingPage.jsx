import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import InstallPrompt from '../components/InstallPrompt';

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, switchLang } = useLanguage();

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  /* animated counter hook */
  const useCounter = (end, duration = 1800) => {
    const [val, setVal] = useState(0);
    useEffect(() => {
      if (!visible) return;
      let start = 0;
      const step = Math.ceil(end / (duration / 30));
      const t = setInterval(() => {
        start += step;
        if (start >= end) { setVal(end); clearInterval(t); }
        else setVal(start);
      }, 30);
      return () => clearInterval(t);
    }, [visible]);
    return val;
  };

  const happyUsers = useCounter(500);
  const jobsDone = useCounter(1200);
  const providers = useCounter(80);

  const handleShare = async () => {
    const shareData = {
      title: '⚡ KroEasy — Apna Kaam, Easy Kaam',
      text: 'Find trusted workers & cars near you! Verified electricians, plumbers, painters, cars — sab ek app pe. Bilkul free!',
      url: 'https://kro-easy.vercel.app',
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) { /* user cancelled */ }
    } else {
      // Fallback: copy link
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareMsg('🔗 Link copied!');
        setTimeout(() => setShareMsg(''), 2500);
      } catch {
        setShareMsg('Copy: kro-easy.vercel.app');
        setTimeout(() => setShareMsg(''), 3000);
      }
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '1px' }}>{t('landingTagline')}</div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Language toggle */}
          <button
            onClick={() => switchLang(lang === 'en' ? 'hi' : 'en')}
            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '700', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
          >
            {lang === 'en' ? '🇮🇳 HI' : '🌐 EN'}
          </button>
          {/* Share Button */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleShare}
              style={{ padding: '8px 12px', fontSize: '13px', fontWeight: '700', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              📤 {t('share')}
            </button>
            {shareMsg && (
              <div style={{ position: 'absolute', top: '110%', right: 0, background: '#1E293B', color: 'white', fontSize: '11px', padding: '5px 10px', borderRadius: '8px', whiteSpace: 'nowrap', zIndex: 100, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {shareMsg}
              </div>
            )}
          </div>
          {/* Login / Dashboard button based on auth state */}
          {user ? (
            <Link to="/dashboard">
              <button className="btn-outline" style={{ padding: '8px 14px', fontSize: '13px', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>{t('dashboard')} →</button>
            </Link>
          ) : (
            <Link to="/login">
              <button className="btn-outline" style={{ padding: '8px 14px', fontSize: '13px', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>{t('login')}</button>
            </Link>
          )}
        </div>
      </div>

      {/* ═══════════ HERO — hook in 3 seconds ═══════════ */}
      <div style={{
        background: 'linear-gradient(165deg, #0F172A 0%, #1E3A8A 45%, #2563EB 100%)',
        padding: '44px 24px 52px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(249,115,22,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-70px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)' }} />
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: '6px', height: '6px', borderRadius: '50%', background: '#F97316', animation: 'pulse 2s infinite' }} />
        <div style={{ position: 'absolute', top: '40%', right: '12%', width: '4px', height: '4px', borderRadius: '50%', background: '#22D3EE', animation: 'pulse 2.5s infinite' }} />

        <div style={{
          position: 'relative', zIndex: 1,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#F97316', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            🛡️ {t('heroTrust')}
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', lineHeight: '1.25', marginBottom: '14px', letterSpacing: '-0.3px' }}>
            {t('heroHeadline')}
          </h1>
          <p style={{ fontSize: '15px', opacity: 0.85, marginBottom: '10px', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 10px' }}>
            {t('heroSubtitle')}
          </p>

          {/* Trust signal */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)',
            borderRadius: '20px', padding: '5px 14px', fontSize: '12px',
            color: '#86EFAC', fontWeight: '600', marginBottom: '24px',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', animation: 'pulse 1.5s infinite' }} />
            {providers}+ {t('verifiedNearYou')}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: '0 auto' }}>
            <Link to="/services">
              <button style={{
                width: '100%', padding: '15px', fontSize: '16px', fontWeight: '800',
                background: 'linear-gradient(135deg, #F97316, #EA580C)',
                border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
                transform: 'scale(1)', transition: 'transform 0.15s',
              }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                🔧 {t('findWorkerCta')}
              </button>
            </Link>
            <Link to="/services?tab=cars">
              <button style={{
                width: '100%', padding: '14px', fontSize: '15px', fontWeight: '700',
                background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                border: '1.5px solid rgba(255,255,255,0.25)', borderRadius: '12px',
                color: 'white', cursor: 'pointer',
              }}>
                🚗 {t('bookCarCta')}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ SOCIAL PROOF COUNTER BAR ═══════════ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        background: 'white', padding: '18px 12px',
        borderBottom: '1px solid #E2E8F0',
      }}>
        {[
          { val: `${happyUsers}+`, label: t('happyUsers'), color: '#1E3A8A' },
          { val: `${jobsDone}+`, label: t('jobsDone'), color: '#16A34A' },
          { val: `${providers}+`, label: t('providers'), color: '#F97316' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: '900', color: s.color }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══════════ PROBLEM → SOLUTION (for Users) ═══════════ */}
      <div style={{ padding: '28px 16px 20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '6px', color: '#0F172A' }}>
          😩 Purana Tarika vs ⚡ KroEasy
        </h2>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748B', marginBottom: '20px' }}>
          See the difference
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { old: '❌ Kisi se pucho, wait karo', now: '✅ Instantly browse providers' },
            { old: '❌ No guarantee of quality', now: '✅ Verified & rated profiles' },
            { old: '❌ Hidden charges, dalaal fees', now: '✅ Direct contact, no middleman' },
            { old: '❌ No history or record', now: '✅ Booking history + call logs' },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
              fontSize: '12px', lineHeight: '1.5',
            }}>
              <div style={{ padding: '8px 10px', background: '#FEF2F2', borderRadius: '8px', color: '#991B1B', fontWeight: '600' }}>{r.old}</div>
              <div style={{ padding: '8px 10px', background: '#F0FDF4', borderRadius: '8px', color: '#166534', fontWeight: '600' }}>{r.now}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ SERVICE CATEGORIES — tap to explore ═══════════ */}
      <div style={{ padding: '8px 16px 24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#0F172A' }}>
          🔧 {t('findWorkers')}
        </h2>
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
          {t('tapCategory')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { icon: '⚡', labelKey: 'skillElectrician', value: 'Electrician' },
            { icon: '🔧', labelKey: 'skillPlumber', value: 'Plumber' },
            { icon: '🪚', labelKey: 'skillCarpenter', value: 'Carpenter' },
            { icon: '🎨', labelKey: 'skillPainter', value: 'Painter' },
            { icon: '❄️', labelKey: 'skillAcRepair', value: 'AC Technician' },
            { icon: '🧱', labelKey: 'skillMason', value: 'Mason' },
            { icon: '🚗', labelKey: 'skillDriver', value: 'Driver' },
            { icon: '🧹', labelKey: 'skillCleaner', value: 'Cleaner' },
            { icon: '🍳', labelKey: 'skillCook', value: 'Cook' },
            { icon: '💇', labelKey: 'skillBeautician', value: 'Beautician' },
            { icon: '🌸', labelKey: 'skillMehndi', value: 'Mehndi Artist' },
            { icon: '🤝', labelKey: 'skillHelper', value: 'Helper' },
          ].map(s => (
            <Link to={`/services?skill=${encodeURIComponent(s.value)}`} key={s.value} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white', borderRadius: '12px', padding: '12px 4px',
                textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                border: '1px solid #F1F5F9', cursor: 'pointer',
                transition: 'transform 0.12s',
              }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.94)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.94)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.2' }}>{t(s.labelKey)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ═══════════ HOW IT WORKS — 3 steps ═══════════ */}
      <div style={{ padding: '24px 16px', background: '#F8FAFC' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', color: '#0F172A' }}>
          📱 {t('howItWorks')}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '360px', margin: '0 auto' }}>
          {[
            { step: '1', icon: '🔍', titleKey: 'step1Title', descKey: 'step1Desc' },
            { step: '2', icon: '📋', titleKey: 'step2Title', descKey: 'step2Desc' },
            { step: '3', icon: '📞', titleKey: 'step3Title', descKey: 'step3Desc' },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              background: 'white', padding: '16px', borderRadius: '14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0',
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', color: 'white',
              }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                  {t('step')} {s.step}: {t(s.titleKey)}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4' }}>{t(s.descKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ SAFETY & TRUST — for Users ═══════════ */}
      <div style={{ padding: '24px 16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '20px', color: '#0F172A' }}>
          🛡️ {t('safetyTitle')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { icon: '✅', titleKey: 'safetyVerified', descKey: 'safetyVerifiedDesc' },
            { icon: '⭐', titleKey: 'safetyRatings', descKey: 'safetyRatingsDesc' },
            { icon: '📞', titleKey: 'safetyCall', descKey: 'safetyCallDesc' },
            { icon: '🔒', titleKey: 'safetyData', descKey: 'safetyDataDesc' },
          ].map((f, i) => (
            <div key={i} style={{
              background: 'white', borderRadius: '14px', padding: '16px 12px',
              textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '6px' }}>{f.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A', marginBottom: '3px' }}>{t(f.titleKey)}</div>
              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>{t(f.descKey)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ WORKER CTA — earn more ═══════════ */}
      <div style={{ margin: '0 16px 20px', padding: '28px 20px', background: 'linear-gradient(145deg, #0F172A, #1E293B)', borderRadius: '20px', textAlign: 'center', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(249,115,22,0.1)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>💼</div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>
            {t('workerCtaTitle')}
          </h3>
          <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '6px', lineHeight: '1.6' }}>
            {t('workerCtaDesc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '16px auto 0', maxWidth: '280px' }}>
            {[
              t('workerBenefit1'),
              t('workerBenefit2'),
              t('workerBenefit3'),
              t('workerBenefit4'),
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', fontWeight: '600', textAlign: 'left' }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
            <Link to="/register?role=labour">
              <button style={{ padding: '12px 20px', fontSize: '14px', fontWeight: '700', background: 'linear-gradient(135deg, #F97316, #EA580C)', border: 'none', borderRadius: '12px', color: 'white', cursor: 'pointer', boxShadow: '0 4px 16px rgba(249,115,22,0.35)' }}>
                🔧 {t('registerAsWorker')}
              </button>
            </Link>
            <Link to="/register?role=carowner">
              <button style={{ padding: '12px 20px', fontSize: '14px', fontWeight: '700', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: 'white', cursor: 'pointer' }}>
                🚗 {t('registerAsCarOwner')}
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════ FINAL USER CTA ═══════════ */}
      <div style={{ padding: '24px 16px 20px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '6px', color: '#0F172A' }}>
          {t('finalCtaTitle')}
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px', lineHeight: '1.6' }}>
          {t('finalCtaDesc')}
        </p>
        <Link to="/services">
          <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '17px', fontWeight: '800', borderRadius: '14px', boxShadow: '0 4px 20px rgba(37,99,235,0.3)' }}>
            ⚡ {t('browseServices')}
          </button>
        </Link>
        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link to="/register" style={{ fontSize: '13px', color: '#1E3A8A', fontWeight: '600', textDecoration: 'none' }}>✨ {t('registerFree')}</Link>
          {!user && (
            <Link to="/login" style={{ fontSize: '13px', color: '#64748B', fontWeight: '500', textDecoration: 'none' }}>🔒 {t('login')}</Link>
          )}
        </div>
      </div>

      <InstallPrompt />

      {/* ═══════════ FOOTER ═══════════ */}
      <div style={{ background: '#0F172A', color: 'white', padding: '28px 20px 20px', marginTop: '8px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>Nowrozabad & Birshingpur Pali</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.5, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Features</div>
            {[
              { label: '🔧 Service Providers', to: '/dashboard' },
              { label: '🚗 Car Booking', to: '/dashboard' },
              { label: '👤 Register Free', to: '/register' },
              ...(!user ? [{ label: '🔒 Login', to: '/login' }] : []),
            ].map((l, i) => (
              <Link key={i} to={l.to} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', marginBottom: '8px' }}>{l.label}</Link>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.5, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support & Legal</div>
            {[
              { label: '🛠️ Help & Support', to: '/support' },
              { label: '📜 Terms & Conditions', to: '/terms' },
              { label: '🔒 Privacy Policy', to: '/privacy' },
            ].map((l, i) => (
              <Link key={i} to={l.to} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', marginBottom: '8px' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase' }}>Contact</div>
          <a href="mailto:sultanalih8@gmail.com" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '6px' }}>📧 sultanalih8@gmail.com</a>
          <a href="https://wa.me/918878353787" style={{ display: 'block', fontSize: '13px', color: '#25D366', textDecoration: 'none', fontWeight: '600' }}>💬 WhatsApp: 8878353787</a>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', opacity: 0.5 }}>© 2025 KroEasy. Made with ❤️ for small-town India.</p>
          <p style={{ fontSize: '11px', opacity: 0.35, marginTop: '4px' }}>Nowrozabad & Birshingpur Pali, MP</p>
        </div>
      </div>

      {/* Pulse animation keyframe */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.5); }
        }
      `}</style>
    </div>
  );
}
