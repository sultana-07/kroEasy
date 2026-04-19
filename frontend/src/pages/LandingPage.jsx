import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import BottomNav from "../components/BottomNav";
import CityModal, { STORAGE_KEY as CITY_KEY } from "../components/CityModal";
import api from "../api";

const SERVICES = [
  { icon: "⚡", hi: "बिजली मिस्त्री", en: "Electrician", skill: "Electrician" },
  { icon: "🔧", hi: "प्लंबर", en: "Plumber", skill: "Plumber" },
  { icon: "❄️", hi: "AC तकनीशियन", en: "AC Technician", skill: "AC Technician" },
  { icon: "🪚", hi: "बढ़ई", en: "Carpenter", skill: "Carpenter" },
  { icon: "🧱", hi: "राजमिस्त्री", en: "Mason", skill: "Mason" },
  { icon: "💇", hi: "ब्यूटीशियन", en: "Beautician", skill: "Beautician" },
  { icon: "🌸", hi: "मेहंदी कलाकार", en: "Mehndi Artist", skill: "Mehndi Artist" },
  { icon: "🤝", hi: "सहायक", en: "Helper", skill: "Helper" },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [activePromo, setActivePromo] = useState(0);
  const [showCityModal, setShowCityModal] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem(CITY_KEY) || '');
  const [banners, setBanners] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, switchLang } = useLanguage();
  const isHi = lang === "hi";

  useEffect(() => {
    setVisible(true);
    api.get('/admin/banners').then(res => {
      if (res.data && res.data.length > 0) setBanners(res.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleShare = async () => {
    const data = {
      title: "⚡ KroEasy",
      text: isHi
        ? "नवरोज़ाबाद में verified कामगार और गाड़ी — एक app पर, बिल्कुल मुफ़्त!"
        : "Verified workers & cars in Nowrozabad — one app, completely free!",
      url: "https://kroeasy.com",
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(data.url);
        setShareMsg(isHi ? "🔗 लिंक कॉपी हो गया!" : "🔗 Link copied!");
        setTimeout(() => setShareMsg(""), 2400);
      } catch {}
    }
  };

  const getDashboard = () => {
    if (!user) return "/login";
    const map = { labour: "/labour-dashboard", carowner: "/carowner-dashboard", admin: "/admin", citypartner: "/citypartner-dashboard" };
    return map[user.role] || "/dashboard";
  };

  const openCityModal = () => setShowCityModal(true);
  const handleCitySelected = (city) => {
    setSelectedCity(city);
    setShowCityModal(false);
  };

  const handleBannerClick = (banner) => {
    if (!banner.link) return;
    if (banner.link.startsWith('http')) {
      window.open(banner.link, '_blank', 'noopener');
    } else {
      navigate(banner.link);
    }
  };

  const trustItems = [
    { icon: "✅", titleHi: "Verified प्रोफाइल", titleEn: "Verified Profiles" },
    { icon: "📞", titleHi: "सीधा संपर्क", titleEn: "Direct Contact" },
    { icon: "💸", titleHi: "Zero Commission", titleEn: "Zero Commission" },
  ];

  return (
    <div style={{ background: "linear-gradient(180deg,#f6f8ff 0%,#eef2ff 100%)", paddingBottom: 88, fontFamily: "'Inter', sans-serif", maxWidth: 480, margin: "0 auto", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .lp-nav { position:sticky; top:0; z-index:40; backdrop-filter: blur(10px); background:rgba(255,255,255,.88); border-bottom:1px solid #e2e8f0; }
        .lp-icon-btn { border:1px solid #dbe4ff; background:#fff; border-radius:12px; min-width:34px; height:34px; cursor:pointer; font-weight:700; color:#1e293b; }
        .lp-chip { display:inline-flex; align-items:center; gap:6px; background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:999px; padding:5px 11px; font-size:11px; font-weight:700; }
        .lp-slider-track { display:flex; width:100%; transition: transform .45s cubic-bezier(.4,0,.2,1); will-change:transform; }
        .lp-cta { width:100%; border:none; border-radius:14px; padding:14px 16px; color:#fff; font-size:15px; font-weight:800; cursor:pointer; }
        .lp-card { background:#fff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 8px 20px rgba(30,41,59,.06); }
        .lp-service-btn { border:none; cursor:pointer; border-radius:14px; background:#fff; padding:14px 8px; display:flex; flex-direction:column; align-items:center; gap:8px; box-shadow:0 6px 16px rgba(15,23,42,.06); }
        .lp-banner-img { width:100%; height:auto; max-height:220px; object-fit:cover; display:block; border-radius:16px; background:#f1f5f9; }
        .lp-banner-slide { flex: 0 0 100%; min-width:100%; overflow:hidden; border-radius:16px; }
      `}</style>

      {showCityModal
        ? <CityModal onCitySelected={handleCitySelected} forceOpen />
        : <CityModal onCitySelected={handleCitySelected} />
      }

      <nav className="lp-nav" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 900, color: "#0f172a", letterSpacing: -0.4 }}>⚡ KroEasy</div>
          {/* City pill in navbar — taps opens city modal */}
          <button
            onClick={openCityModal}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 2, padding: '2px 9px', borderRadius: 999,
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
              border: '1.5px solid #c7d2fe', background: '#eef2ff', color: '#4338ca',
            }}
          >
            📍 {selectedCity || (isHi ? 'शहर चुनें' : 'Choose city')} ▾
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <button className="lp-icon-btn" onClick={() => switchLang(isHi ? "en" : "hi")}>{isHi ? "EN" : "🇮🇳"}</button>
          <div style={{ position: "relative" }}>
            <button className="lp-icon-btn" onClick={handleShare}>📤</button>
            {shareMsg && <div style={{ position: "absolute", top: "112%", right: 0, whiteSpace: "nowrap", fontSize: 11, background: "#0f172a", color: "#fff", borderRadius: 8, padding: "5px 9px" }}>{shareMsg}</div>}
          </div>
          <Link to={user ? getDashboard() : "/login"} style={{ textDecoration: "none" }}>
            <button className="lp-icon-btn" style={{ padding: "0 10px", minWidth: 80, background: user ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#fff", color: user ? "#fff" : "#334155" }}>
              {user ? (isHi ? "डैशबोर्ड" : "Dashboard") : (isHi ? "लॉगिन" : "Login")}
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Dynamic banner slider — image only ── */}
      {banners.length > 0 && (
        <section style={{ padding: "16px 16px 0" }}>
          <div className="lp-card" style={{ overflow: "hidden", position: "relative", borderRadius: 18, borderLeft: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', boxShadow: '0 4px 18px rgba(30,41,59,.1)' }}>
            {/* Outer wrapper clips the sliding strip */}
            <div style={{ width: "100%", overflow: "hidden", borderRadius: 18 }}>
              <div className="lp-slider-track" style={{ transform: `translateX(-${activePromo * 100}%)` }}>
                {banners.map((banner, i) => (
                  <div
                    key={banner._id}
                    className="lp-banner-slide"
                    onClick={() => handleBannerClick(banner)}
                    style={{ cursor: banner.link ? 'pointer' : 'default' }}
                  >
                    <img
                      src={banner.imageUrl}
                      alt={`Banner ${i + 1}`}
                      className="lp-banner-img"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {banners.length > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
              {banners.map((_, i) => (
                <button key={i} onClick={() => setActivePromo(i)} style={{ width: activePromo === i ? 24 : 9, height: 9, border: "none", borderRadius: 999, background: activePromo === i ? "#1d4ed8" : "#cbd5e1", cursor: "pointer", transition: "all .2s ease", padding: 0 }} />
              ))}
            </div>
          )}
        </section>
      )}

      <section style={{ padding: "26px 14px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: "all .45s ease" }}>
        <div style={{ padding: "2px 2px 0" }}>
          <div className="lp-chip">● {isHi ? "25+ भरोसेमंद प्रोफाइल" : "25+ trusted profiles"}</div>
          <h1 style={{ margin: "12px 0 8px", fontSize: 28, lineHeight: 1.2, letterSpacing: -0.5, color: "#0f172a" }}>
            {isHi
              ? `${selectedCity ? (selectedCity === 'Nowrozabad' ? 'नवरोज़ाबाद' : selectedCity === 'Birshingpur Pali' ? 'बीरसिंहपुर पाली' : selectedCity === 'Dindori' ? 'डिंडोरी' : selectedCity) : 'नवरोज़ाबाद'} में घर के काम के लिए सही लोग`
              : `Trusted Home Services in ${selectedCity || 'Nowrozabad & Birshingpur Pali'}`
            }
          </h1>

          <p style={{ margin: 0, color: "#475569", fontWeight: 500, fontSize: 14, lineHeight: 1.6 }}>
            {isHi ? "बिजली, AC, ब्यूटी, मेहंदी और रोज़ के काम - आसान बुकिंग के साथ।" : "Electric, AC, beauty, mehndi and daily services with easy booking."}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
            <Link to="/services" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ background: "linear-gradient(135deg,#f97316,#ef4444)" }}>{isHi ? "सेवा देखें" : "View Services"}</button></Link>
            <Link to="/services?tab=cars" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ background: "linear-gradient(135deg,#0891b2,#2563eb)" }}>{isHi ? "गाड़ी बुक करें" : "Book a Car"}</button></Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "26px 14px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{isHi ? "लोकप्रिय सेवाएं" : "Popular Services"}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{isHi ? "सही कामगार चुनने के लिए टैप करें" : "Tap to open filtered workers list"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginTop: 12 }}>
          {SERVICES.map((s) => (
            <button key={s.skill} className="lp-service-btn" onClick={() => navigate(`/services?skill=${encodeURIComponent(s.skill)}`)}>
              <span style={{ fontSize: 30, lineHeight: 1 }}>{s.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", textAlign: "center", lineHeight: 1.3 }}>{isHi ? s.hi : s.en}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>
          {isHi
            ? "नवरोज़ाबाद में बिजली मिस्त्री, प्लंबर, ब्यूटीशियन, AC तकनीशियन, बढ़ई, राजमिस्त्री, मेहंदी आर्टिस्ट और गाड़ी बुकिंग — KroEasy पर मुफ़्त।"
            : "Electrician, Plumber, Beautician, AC Technician, Carpenter, Mason, Mehndi Artist & Car Booking in Nowrozabad & Birshingpur Pali — free on KroEasy."}
        </div>
      </section>

      <section style={{ padding: "26px 14px 0" }}>
        <div className="lp-card" style={{ padding: "14px 10px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {trustItems.map((item) => (
            <div key={item.titleEn} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22 }}>{item.icon}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: "#334155", fontWeight: 700, lineHeight: 1.3 }}>{isHi ? item.titleHi : item.titleEn}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "26px 14px 0" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a", marginBottom: 10 }}>{isHi ? "कैसे काम करता है?" : "How it works"}</div>
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { no: "1", hi: "सेवा चुनें", en: "Choose service", descHi: "जिस service की जरूरत है उसे चुनें", descEn: "Select the service you need", bg: "#eef2ff", dot: "#4338ca" },
            { no: "2", hi: "प्रोफाइल देखें", en: "Review profiles", descHi: "rating और details चेक करें", descEn: "Check ratings and details", bg: "#ecfdf5", dot: "#059669" },
            { no: "3", hi: "बुक या कॉल करें", en: "Book or call", descHi: "direct संपर्क, fast response", descEn: "Direct contact with fast response", bg: "#fff7ed", dot: "#ea580c" },
          ].map((item) => (
            <div key={item.no} className="lp-card" style={{ padding: "12px", display: "flex", alignItems: "center", gap: 10, background: item.bg }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: item.dot, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{item.no}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{isHi ? item.hi : item.en}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{isHi ? item.descHi : item.descEn}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "26px 14px 0" }}>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="lp-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{isHi ? "कामगार / मज़दूर हो?" : "Are you a Worker?"}</div>
            <div style={{ marginTop: 5, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{isHi ? "अपना profile बनाएं और direct customer calls पाएं।" : "Create your profile and receive direct customer calls."}</div>
            <Link to="/register?role=labour" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ marginTop: 10, background: "linear-gradient(135deg,#f97316,#ef4444)" }}>{isHi ? "Worker के रूप में Register" : "Register as Worker"}</button></Link>
          </div>
          <div className="lp-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{isHi ? "गाड़ी मालिक हो?" : "Do you own a Car?"}</div>
            <div style={{ marginTop: 5, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{isHi ? "अपनी गाड़ी list करें और local bookings पाएं।" : "List your car and get local bookings."}</div>
            <Link to="/register?role=carowner" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ marginTop: 10, background: "linear-gradient(135deg,#1d4ed8,#4338ca)" }}>{isHi ? "Car Owner के रूप में Register" : "Register as Car Owner"}</button></Link>
          </div>
          {/* Direct call button — inline, after car register */}
          <a href="tel:8878353787" style={{ textDecoration: "none", display: "block" }}>
            <button style={{
              width: "100%", padding: "14px 16px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg,#16a34a,#15803d)",
              color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: "0 4px 18px rgba(22,163,74,0.3)",
              animation: "pulse-green 2s infinite",
            }}>
              <span style={{ fontSize: 20 }}>📞</span>
              <span>{isHi ? "सीधे बुक करें — 8878353787" : "Book Directly — Call 8878353787"}</span>
            </button>
          </a>
          <style>{`
            @keyframes pulse-green {
              0%,100% { box-shadow: 0 4px 18px rgba(22,163,74,0.3); }
              50% { box-shadow: 0 4px 28px rgba(22,163,74,0.6); }
            }
          `}</style>
        </div>
      </section>

      <footer style={{ margin: "28px 12px 0", background: "linear-gradient(145deg,#0f172a,#1e293b)", color: "#cbd5e1", borderRadius: 20, padding: "18px 14px 78px" }}>
        <div style={{ fontSize: 20, color: "#fff", fontWeight: 900 }}>⚡ KroEasy</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
          Trusted local services platform for homes and daily needs.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <Link to="/services" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>Services</Link>
          <Link to="/support" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>Support</Link>
          <Link to="/about" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>About</Link>
          <Link to="/login" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>Login</Link>
          <Link to="/terms" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>Terms</Link>
          <Link to="/privacy" style={{ color: "#dbeafe", textDecoration: "none", fontSize: 12 }}>Privacy</Link>
        </div>
        <div style={{ marginTop: 14, borderTop: "1px solid rgba(203,213,225,.25)", paddingTop: 10, fontSize: 11, color: "#94a3b8" }}>
          © 2026 KroEasy. {isHi ? "सभी अधिकार सुरक्षित।" : "All rights reserved."}
        </div>
      </footer>


      <BottomNav />
    </div>
  );
}
