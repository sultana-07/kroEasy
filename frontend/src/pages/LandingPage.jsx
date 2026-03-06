import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import InstallPrompt from '../components/InstallPrompt';


/* ─── Animated counter ─────────────────────────────────────────────────── */
function useCounter(end, duration = 1800) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    if (!started) return;
    let cur = 0;
    const step = Math.ceil(end / (duration / 30));
    const iv = setInterval(() => {
      cur += step;
      if (cur >= end) { setVal(end); clearInterval(iv); } else setVal(cur);
    }, 30);
    return () => clearInterval(iv);
  }, [started]);
  return [val, () => setStarted(true)];
}

/* ─── Intersection observer ─────────────────────────────────────────────── */
function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

const SERVICES = [
  { icon: '⚡', lk: 'skillElectrician', value: 'Electrician' },
  { icon: '🔧', lk: 'skillPlumber', value: 'Plumber' },
  { icon: '🪚', lk: 'skillCarpenter', value: 'Carpenter' },
  { icon: '❄️', lk: 'skillAcRepair', value: 'AC Technician' },
  { icon: '🧱', lk: 'skillMason', value: 'Mason' },
  { icon: '💇', lk: 'skillBeautician', value: 'Beautician' },
  { icon: '🌸', lk: 'skillMehndi', value: 'Mehndi Artist' },
  { icon: '🤝', lk: 'skillHelper', value: 'Helper' },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [cycleIdx, setCycleIdx] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef);

  const [users, startUsers] = useCounter(500);
  const [jobs, startJobs] = useCounter(1200);
  const [providers, startProviders] = useCounter(80);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);
  useEffect(() => { if (statsInView) { startUsers(); startJobs(); startProviders(); } }, [statsInView]);


  // cycling hero subtitles — show service names one by one
  const cycleItems = [
    { icon: '🚗', text: t('heroCta2') },
    { icon: '⚡', text: t('skillElectrician') },
    { icon: '🔧', text: t('skillPlumber') },
    { icon: '❄️', text: t('skillAcRepair') },
    { icon: '💇', text: t('skillBeautician') },
    { icon: '🧱', text: t('skillMason') },
    { icon: '🤝', text: t('skillHelper') },
  ];
  useEffect(() => {
    const iv = setInterval(() => setCycleIdx(i => (i + 1) % cycleItems.length), 1800);
    return () => clearInterval(iv);
  }, [cycleItems.length]);

  const handleShare = async () => {
    const shareData = { title: '⚡ KroEasy', text: 'Apne sheher ke verified workers aur cars ek app pe. Bilkul free!', url: 'https://kroeasy.com' };
    if (navigator.share) { try { await navigator.share(shareData); } catch {} }
    else {
      try { await navigator.clipboard.writeText(shareData.url); setShareMsg(t('linkCopied')); setTimeout(() => setShareMsg(''), 2500); } catch {}
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.6)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,.5)} 70%{box-shadow:0 0 0 14px rgba(249,115,22,0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .install-glow { animation: glow 2s infinite; }
        .bounce-icon { animation: bounce 2s ease-in-out infinite; display:inline-block; }
        .shimmer-btn { background: linear-gradient(90deg,#F97316,#EF4444,#F97316); background-size:200% auto; animation: shimmer 2s linear infinite; }
        .cycle-item { animation: fadeUp 0.4s ease forwards; }
        .service-card:active { transform:scale(0.91) !important; }
      `}</style>

      {/* ══ HEADER ════════════════════════════════════════════════════════ */}
      <div className="app-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:'22px', fontWeight:'800' }}>⚡ KroEasy</div>
          <div style={{ fontSize:'11px', opacity:0.8 }}>{t('landingTagline')}</div>
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <button onClick={() => switchLang(lang === 'en' ? 'hi' : 'en')}
            style={{ width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'white', cursor:'pointer', fontWeight:'700' }}>
            {lang === 'en' ? '🇮🇳' : 'EN'}
          </button>
          <div style={{ position:'relative' }}>
            <button onClick={handleShare} style={{ width:'34px', height:'34px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', color:'white', cursor:'pointer' }}>📤</button>
            {shareMsg && <div style={{ position:'absolute', top:'110%', right:0, background:'#1E293B', color:'white', fontSize:'11px', padding:'5px 10px', borderRadius:'8px', whiteSpace:'nowrap', zIndex:100 }}>{shareMsg}</div>}
          </div>
          {user ? (
            <Link to="/dashboard"><button style={{ padding:'6px 14px', fontSize:'12px', fontWeight:'700', background:'#F97316', border:'none', borderRadius:'8px', color:'white', cursor:'pointer' }}>{t('dashboard')} →</button></Link>
          ) : (
            <Link to="/login"><button style={{ padding:'6px 14px', fontSize:'12px', fontWeight:'700', background:'#F97316', border:'none', borderRadius:'8px', color:'white', cursor:'pointer' }}>{t('login')}</button></Link>
          )}
        </div>
      </div>

      {/* ══ HERO ═══════════════════════════════════════════════════════════ */}
      <div style={{ background:'linear-gradient(165deg,#0F172A 0%,#1E3A8A 50%,#2563EB 100%)', padding:'36px 20px 48px', textAlign:'center', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',top:'-40px',right:'-40px',width:'180px',height:'180px',borderRadius:'50%',background:'rgba(249,115,22,.08)' }}/>
        <div style={{ position:'absolute',bottom:'-60px',left:'-30px',width:'160px',height:'160px',borderRadius:'50%',background:'rgba(59,130,246,.1)' }}/>
        <div style={{ position:'absolute',top:'20%',left:'8%',width:'8px',height:'8px',borderRadius:'50%',background:'#F97316',animation:'pulse 2s infinite' }}/>
        <div style={{ position:'absolute',top:'35%',right:'10%',width:'5px',height:'5px',borderRadius:'50%',background:'#22D3EE',animation:'pulse 2.5s infinite' }}/>

        <div style={{ position:'relative', zIndex:1, opacity:visible?1:0, transform:visible?'translateY(0)':'translateY(28px)', transition:'all .7s cubic-bezier(.16,1,.3,1)' }}>
          {/* Live count pill */}
          <div style={{ display:'inline-flex',alignItems:'center',gap:'6px',background:'rgba(22,163,74,.15)',border:'1px solid rgba(22,163,74,.35)',borderRadius:'20px',padding:'5px 14px',fontSize:'12px',color:'#86EFAC',fontWeight:'600',marginBottom:'16px' }}>
            <span style={{ width:'8px',height:'8px',borderRadius:'50%',background:'#22C55E',animation:'pulse 1.5s infinite',display:'inline-block' }}/>
            {providers}+ {t('heroTrust')}
          </div>

          {/* H1 */}
          <h1 style={{ fontSize:'28px',fontWeight:'900',lineHeight:'1.25',marginBottom:'10px',letterSpacing:'-0.3px' }}>
            {t('heroH1a')}<br/>
            <span style={{ color:'#F97316' }}>{t('heroH1b')}</span>
          </h1>

          {/* Cycling service showcase */}
          <div style={{ marginBottom:'18px', minHeight:'64px' }}>
            <div style={{ fontSize:'13px', color:'rgba(255,255,255,.65)', marginBottom:'6px' }}>
              {t('heroSubHi')}
            </div>
            <div key={cycleIdx} className="cycle-item"
              style={{ display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(249,115,22,.18)',border:'1px solid rgba(249,115,22,.4)',borderRadius:'16px',padding:'8px 20px',fontSize:'18px',fontWeight:'800',color:'white' }}>
              <span style={{ fontSize:'24px' }}>{cycleItems[cycleIdx]?.icon}</span>
              {cycleItems[cycleIdx]?.text}
            </div>
            <div style={{ fontSize:'12px', color:'rgba(255,255,255,.6)', marginTop:'8px' }}>
              {t('heroSubServices')}
            </div>
            <div style={{ fontSize:'12px', color:'#86EFAC', marginTop:'4px', fontWeight:'600' }}>
              {t('heroSubLine2')}
            </div>
          </div>

          {/* Main CTAs */}
          <div style={{ display:'flex',flexDirection:'column',gap:'10px',maxWidth:'300px',margin:'0 auto 16px' }}>
            <Link to="/services" style={{ textDecoration:'none' }}>
              <button className="shimmer-btn" aria-label="Book electrician, plumber, beautician, AC technician in Nowrozabad" style={{ width:'100%',padding:'16px',fontSize:'17px',fontWeight:'800',border:'none',borderRadius:'14px',color:'white',cursor:'pointer',boxShadow:'0 6px 24px rgba(249,115,22,.45)' }}>
                {t('heroCta1')}
              </button>
            </Link>
            <Link to="/services?tab=cars" style={{ textDecoration:'none' }}>
              <button aria-label="Book car taxi in Nowrozabad and Birshingpur Pali" style={{ width:'100%',padding:'14px',fontSize:'15px',fontWeight:'700',background:'rgba(255,255,255,.1)',backdropFilter:'blur(10px)',border:'1.5px solid rgba(255,255,255,.25)',borderRadius:'12px',color:'white',cursor:'pointer' }}>
                {t('heroCta2')}
              </button>
            </Link>
          </div>


        </div>
      </div>

      {/* ══ STATS ══════════════════════════════════════════════════════════ */}
      <div ref={statsRef} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',background:'white',padding:'18px 12px',borderBottom:'1px solid #E2E8F0' }}>
        {[
          { val:`${users}+`, label:t('statUsers'), color:'#1E3A8A', icon:'😊' },
          { val:`${jobs}+`, label:t('statJobs'), color:'#16A34A', icon:'✅' },
          { val:`${providers}+`, label:t('statWorkers'), color:'#F97316', icon:'🔧' },
        ].map((s,i) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'18px',marginBottom:'2px' }}>{s.icon}</div>
            <div style={{ fontSize:'22px',fontWeight:'900',color:s.color }}>{s.val}</div>
            <div style={{ fontSize:'10px',color:'#64748B',fontWeight:'600' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ WHO IS THIS FOR ════════════════════════════════════════════════ */}
      <div style={{ padding:'24px 16px 20px',background:'#FAFAFA' }}>
        <h2 style={{ fontSize:'20px',fontWeight:'800',textAlign:'center',marginBottom:'4px',color:'#0F172A' }}>🤔 {t('whyTitle')}</h2>
        <p style={{ textAlign:'center',fontSize:'13px',color:'#64748B',marginBottom:'18px' }}>{t('whySub')}</p>
        <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
          {[
            { emoji:'👨‍👩‍👧', titleK:'for_customer_title', descK:'for_customer_desc', btnK:'for_customer_btn', to:'/services',      color:'#EFF6FF', border:'#BFDBFE', tc:'#1E3A8A' },
            { emoji:'🔧',        titleK:'for_worker_title',   descK:'for_worker_desc',   btnK:'for_worker_btn',   to:'/register?role=labour',    color:'#F0FDF4', border:'#BBF7D0', tc:'#16A34A' },
            { emoji:'🚗',        titleK:'for_car_title',      descK:'for_car_desc',      btnK:'for_car_btn',      to:'/register?role=carowner',  color:'#FFF7ED', border:'#FED7AA', tc:'#EA580C' },
          ].map((c,i) => (
            <div key={i} style={{ background:c.color,border:`1.5px solid ${c.border}`,borderRadius:'16px',padding:'16px',display:'flex',gap:'14px',alignItems:'flex-start' }}>
              <div style={{ fontSize:'36px',flexShrink:0 }}>{c.emoji}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'15px',fontWeight:'800',color:c.tc,marginBottom:'4px' }}>{t(c.titleK)}</div>
                <div style={{ fontSize:'12px',color:'#374151',lineHeight:'1.6',marginBottom:'10px' }}>{t(c.descK)}</div>
                <Link to={c.to} style={{ textDecoration:'none' }}>
                  <button style={{ padding:'7px 16px',background:c.tc,border:'none',borderRadius:'20px',color:'white',fontSize:'12px',fontWeight:'700',cursor:'pointer' }}>{t(c.btnK)}</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ SERVICE CATEGORIES ═════════════════════════════════════════════ */}
      <div style={{ padding:'24px 16px' }}>
        <h2 style={{ fontSize:'20px',fontWeight:'800',textAlign:'center',marginBottom:'4px',color:'#0F172A' }}>🔧 {t('pickService')}</h2>
        <p style={{ textAlign:'center',fontSize:'12px',color:'#64748B',marginBottom:'16px' }}>{t('pickServiceSub')}</p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px' }}>
          {SERVICES.map(s => (
            <Link to={`/services?skill=${encodeURIComponent(s.value)}`} key={s.value} style={{ textDecoration:'none' }}>
              <div className="service-card"
                style={{ background:'white',borderRadius:'14px',padding:'12px 4px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.07)',border:'1px solid #F1F5F9',cursor:'pointer',transition:'transform .12s' }}
                onMouseDown={e => e.currentTarget.style.transform='scale(0.92)'}
                onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
              >
                <div style={{ fontSize:'28px',marginBottom:'5px' }}>{s.icon}</div>
                <div style={{ fontSize:'10px',fontWeight:'700',color:'#1E3A8A',lineHeight:'1.2' }}>{t(s.lk)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <div style={{ padding:'0 16px 24px',background:'#F8FAFC' }}>
        <h2 style={{ fontSize:'20px',fontWeight:'800',textAlign:'center',padding:'24px 0 16px',color:'#0F172A' }}>📱 {t('howItWorksTitle')}</h2>
        <div style={{ display:'flex',flexDirection:'column',gap:'10px',maxWidth:'360px',margin:'0 auto' }}>
          {[
            { num:'1', icon:'🔍', tk:'step1Title', dk:'step1Desc' },
            { num:'2', icon:'📋', tk:'step2Title', dk:'step2Desc' },
            { num:'3', icon:'📞', tk:'step3Title', dk:'step3Desc' },
          ].map((s,i) => (
            <div key={i} style={{ display:'flex',alignItems:'center',gap:'14px',background:'white',padding:'16px',borderRadius:'14px',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #E2E8F0' }}>
              <div style={{ width:'48px',height:'48px',borderRadius:'50%',flexShrink:0,background:'linear-gradient(135deg,#1E3A8A,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'22px' }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize:'14px',fontWeight:'800',color:'#0F172A',marginBottom:'2px' }}>Step {s.num}: {t(s.tk)}</div>
                <div style={{ fontSize:'12px',color:'#64748B',lineHeight:'1.4' }}>{t(s.dk)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ TESTIMONIALS ═══════════════════════════════════════════════════ */}
      <div style={{ padding:'0 16px 24px' }}>
        <h2 style={{ fontSize:'20px',fontWeight:'800',textAlign:'center',paddingBottom:'16px',color:'#0F172A' }}>⭐ {t('testimonialsTitle')}</h2>
        <div style={{ display:'flex',flexDirection:'column',gap:'10px' }}>
          {[
            { name:'रमेश कुमार', city:'नौरोजाबाद', stars:5, text:'"बहुत बढ़िया! Electrician 1 घंटे में आए, काम भी अच्छा हुआ।"' },
            { name:'Sunita Verma', city:'Birshingpur', stars:5, text:'"App easy hai, Hindi mein hai. Plumber ka number turant mila!"' },
            { name:'राजेश पटेल', city:'रेवा', stars:5, text:'"मेरी car यहाँ list है — महीने में 3-4 booking आ जाती है।"' },
          ].map((r,i) => (
            <div key={i} style={{ background:'white',borderRadius:'16px',padding:'16px',boxShadow:'0 2px 10px rgba(0,0,0,.06)',border:'1px solid #F1F5F9' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:'10px' }}>
                  <div style={{ width:'36px',height:'36px',borderRadius:'50%',background:'linear-gradient(135deg,#1E3A8A,#2563EB)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:'700',fontSize:'14px' }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontWeight:'700',fontSize:'13px',color:'#0F172A' }}>{r.name}</div>
                    <div style={{ fontSize:'11px',color:'#94A3B8' }}>🏙️ {r.city}</div>
                  </div>
                </div>
                <div style={{ fontSize:'14px',letterSpacing:'1px' }}>{'⭐'.repeat(r.stars)}</div>
              </div>
              <p style={{ fontSize:'13px',color:'#374151',lineHeight:'1.7',margin:0,fontStyle:'italic' }}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BEFORE / AFTER ═════════════════════════════════════════════════ */}
      <div style={{ padding:'0 16px 24px',background:'#F8FAFC' }}>
        <h2 style={{ fontSize:'20px',fontWeight:'800',textAlign:'center',padding:'24px 0 16px',color:'#0F172A' }}>{t('beforeAfterTitle')}</h2>
        <div style={{ display:'flex',flexDirection:'column',gap:'8px' }}>
          {[
            { ok:'compareOld1', nk:'compareNew1' },
            { ok:'compareOld2', nk:'compareNew2' },
            { ok:'compareOld3', nk:'compareNew3' },
            { ok:'compareOld4', nk:'compareNew4' },
          ].map((r,i) => (
            <div key={i} style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px',lineHeight:'1.5' }}>
              <div style={{ padding:'10px',background:'#FEF2F2',borderRadius:'10px',color:'#991B1B',fontWeight:'600' }}>{t(r.ok)}</div>
              <div style={{ padding:'10px',background:'#F0FDF4',borderRadius:'10px',color:'#166534',fontWeight:'600' }}>{t(r.nk)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ WORKER CTA ═════════════════════════════════════════════════════ */}
      <div style={{ margin:'0 16px 20px',padding:'28px 20px',background:'linear-gradient(145deg,#0F172A,#1E293B)',borderRadius:'20px',textAlign:'center',color:'white',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:'-30px',right:'-30px',width:'120px',height:'120px',borderRadius:'50%',background:'rgba(249,115,22,.1)' }}/>
        <div style={{ position:'relative',zIndex:1 }}>
          <div style={{ fontSize:'40px',marginBottom:'8px' }}>💼</div>
          <h3 style={{ fontSize:'20px',fontWeight:'800',marginBottom:'8px' }}>{t('workerCtaTitle')}</h3>
          <p style={{ fontSize:'13px',opacity:.8,marginBottom:'16px',lineHeight:'1.6' }}>{t('workerCtaDesc')}</p>
          <div style={{ display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/register?role=labour">
              <button className="shimmer-btn" style={{ padding:'12px 20px',fontSize:'14px',fontWeight:'800',border:'none',borderRadius:'12px',color:'white',cursor:'pointer' }}>{t('workerCtaBtn')}</button>
            </Link>
            <Link to="/register?role=carowner">
              <button style={{ padding:'12px 20px',fontSize:'14px',fontWeight:'700',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.2)',borderRadius:'12px',color:'white',cursor:'pointer' }}>{t('carOwnerCtaBtn')}</button>
            </Link>
          </div>
        </div>
      </div>

      {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
      <div style={{ padding:'24px 16px 20px',textAlign:'center' }}>
        <h2 style={{ fontSize:'22px',fontWeight:'800',marginBottom:'6px',color:'#0F172A' }}>{t('finalCtaTitle')}</h2>
        <p style={{ fontSize:'13px',color:'#64748B',marginBottom:'20px',lineHeight:'1.6' }}>{t('finalCtaDesc')}</p>
        <Link to="/services">
          <button className="btn-primary" style={{ width:'100%',padding:'16px',fontSize:'17px',fontWeight:'800',borderRadius:'14px',boxShadow:'0 4px 20px rgba(37,99,235,.3)' }}>
            {t('browseServices')}
          </button>
        </Link>
        <div style={{ marginTop:'12px',display:'flex',justifyContent:'center',gap:'16px' }}>
          <Link to="/register" style={{ fontSize:'13px',color:'#1E3A8A',fontWeight:'600',textDecoration:'none' }}>{t('registerFree')}</Link>
          {!user && <Link to="/login" style={{ fontSize:'13px',color:'#64748B',fontWeight:'500',textDecoration:'none' }}>🔒 {t('login')}</Link>}
        </div>
      </div>

      {/* ══ INSTALL BANNER ════════════════════════════════════════════════ */}
      <InstallPrompt />

      {/* ══ TRUST BADGES ══════════════════════════════════════════════════ */}
      <div style={{ padding:'0 16px 24px' }}>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px' }}>
          {[
            { icon:'✅', tk:'trust1Title', dk:'trust1Desc' },
            { icon:'⭐', tk:'trust2Title', dk:'trust2Desc' },
            { icon:'📞', tk:'trust3Title', dk:'trust3Desc' },
            { icon:'🔒', tk:'trust4Title', dk:'trust4Desc' },
          ].map((f,i) => (
            <div key={i} style={{ background:'white',borderRadius:'14px',padding:'14px 12px',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,.05)',border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:'26px',marginBottom:'5px' }}>{f.icon}</div>
              <div style={{ fontSize:'12px',fontWeight:'700',color:'#1E3A8A',marginBottom:'3px' }}>{t(f.tk)}</div>
              <div style={{ fontSize:'10px',color:'#64748B',lineHeight:'1.4' }}>{t(f.dk)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <div style={{ background:'#0F172A',color:'white',padding:'28px 20px 20px',marginTop:'8px' }}>
        <div style={{ textAlign:'center',marginBottom:'20px' }}>
          <div style={{ fontSize:'22px',fontWeight:'800',marginBottom:'4px' }}>⚡ KroEasy</div>
          <div style={{ fontSize:'12px',opacity:.6 }}>Nowrozabad &amp; Birshingpur Pali</div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px' }}>
          <div>
            <div style={{ fontSize:'12px',fontWeight:'700',opacity:.5,marginBottom:'10px',textTransform:'uppercase',letterSpacing:'.5px' }}>{t('footerServices')}</div>
            {[{label:t('footerFindWorker'),to:'/services'},{label:t('footerBookCar'),to:'/services?tab=cars'},{label:t('footerRegister'),to:'/register'}].map((l,i) => (
              <Link key={i} to={l.to} style={{ display:'block',fontSize:'13px',color:'rgba(255,255,255,.75)',textDecoration:'none',marginBottom:'8px' }}>{l.label}</Link>
            ))}
          </div>
          <div>
            <div style={{ fontSize:'12px',fontWeight:'700',opacity:.5,marginBottom:'10px',textTransform:'uppercase',letterSpacing:'.5px' }}>{t('footerSupport')}</div>
            {[{label:t('footerHelp'),to:'/support'},{label:t('footerTerms'),to:'/terms'},{label:t('footerPrivacy'),to:'/privacy'}].map((l,i) => (
              <Link key={i} to={l.to} style={{ display:'block',fontSize:'13px',color:'rgba(255,255,255,.75)',textDecoration:'none',marginBottom:'8px' }}>{l.label}</Link>
            ))}
          </div>
        </div>
        <div style={{ padding:'14px',background:'rgba(255,255,255,.07)',borderRadius:'12px',marginBottom:'20px' }}>
          <div style={{ fontSize:'12px',fontWeight:'700',opacity:.6,marginBottom:'8px',textTransform:'uppercase' }}>{t('footerContact')}</div>
          <a href="mailto:sultanalih8@gmail.com" style={{ display:'block',fontSize:'13px',color:'rgba(255,255,255,.8)',textDecoration:'none',marginBottom:'6px' }}>📧 sultanalih8@gmail.com</a>
          <a href="https://wa.me/918878353787" style={{ display:'block',fontSize:'13px',color:'#25D366',textDecoration:'none',fontWeight:'600' }}>💬 WhatsApp: 8878353787</a>
        </div>
        <div style={{ borderTop:'1px solid rgba(255,255,255,.1)',paddingTop:'16px',textAlign:'center' }}>
          <p style={{ fontSize:'12px',opacity:.5 }}>{t('footerCopyright')}</p>
        </div>

        {/* ── SEO keyword block – visible to Google, subtle for users ─── */}
        <div style={{ marginTop:'16px', paddingTop:'14px', borderTop:'1px solid rgba(255,255,255,.06)', fontSize:'10px', color:'rgba(255,255,255,.28)', lineHeight:'1.9', textAlign:'center' }}>
          <p style={{ margin:'0 0 4px' }}>
            <strong style={{ color:'rgba(255,255,255,.35)' }}>Nowrozabad Services:</strong>{' '}
            Electrician Nowrozabad · Plumber Nowrozabad · Beautician Nowrozabad · AC Technician Nowrozabad ·
            Carpenter Nowrozabad · Mason Nowrozabad · Mehndi Artist Nowrozabad · Car Booking Nowrozabad
          </p>
          <p style={{ margin:'0 0 4px' }}>
            <strong style={{ color:'rgba(255,255,255,.35)' }}>Birshingpur Pali Services:</strong>{' '}
            Electrician Birshingpur Pali · Plumber Birshingpur Pali · Beautician Birshingpur Pali ·
            AC Repair Birshingpur Pali · Car Rental Birshingpur Pali · Labour Service Birshingpur Pali
          </p>
          <p style={{ margin:0 }}>
            बिजलीवाला नौरोजाबाद · प्लंबर नौरोजाबाद · ब्यूटीशियन नौरोजाबाद · एसी टेक्नीशियन नौरोजाबाद ·
            कारपेंटर नौरोजाबाद · कार बुकिंग नौरोजाबाद · मेसन नौरोजाबाद · मेहंदी आर्टिस्ट नौरोजाबाद
          </p>
        </div>
      </div>
    </div>
  );
}
