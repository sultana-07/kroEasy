import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import BottomNav from "../components/BottomNav";
import electricianBanner from "../assets/banners/electrician-banner.svg";
import acTechnicianBanner from "../assets/banners/ac-technician-banner.svg";
import beauticianBanner from "../assets/banners/beautician-banner.svg";
import mehndiBanner from "../assets/banners/mehndi-banner.svg";

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

const PROMO_BANNERS = [
  { image: electricianBanner, titleHi: "इलेक्ट्रिशियन", titleEn: "Electrician", subtitleHi: "घर के बिजली काम तुरंत", subtitleEn: "Quick home electric fixes", to: "/services?skill=Electrician" },
  { image: acTechnicianBanner, titleHi: "AC तकनीशियन", titleEn: "AC Technician", subtitleHi: "ठंडक, गैस रिफिल, सर्विस", subtitleEn: "Cooling, gas refill, service", to: "/services?skill=AC%20Technician" },
  { image: beauticianBanner, titleHi: "ब्यूटीशियन घर पर", titleEn: "Beautician At Home", subtitleHi: "ब्राइडल और पार्टी मेकअप", subtitleEn: "Bridal and party makeup", to: "/services?skill=Beautician" },
  { image: mehndiBanner, titleHi: "मेहंदी आर्टिस्ट", titleEn: "Mehndi Artist", subtitleHi: "शादी और त्योहार के डिजाइन", subtitleEn: "Wedding and festive designs", to: "/services?skill=Mehndi%20Artist" },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [activePromo, setActivePromo] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang, switchLang } = useLanguage();
  const isHi = lang === "hi";

  useEffect(() => {
    setVisible(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setActivePromo((prev) => (prev + 1) % PROMO_BANNERS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

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
    const map = { labour: "/labour-dashboard", carowner: "/carowner-dashboard", admin: "/admin" };
    return map[user.role] || "/dashboard";
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
        .lp-slider-track { display:flex; width:100%; transition: transform .45s ease; }
        .lp-cta { width:100%; border:none; border-radius:14px; padding:14px 16px; color:#fff; font-size:15px; font-weight:800; cursor:pointer; }
        .lp-card { background:#fff; border:1px solid #e2e8f0; border-radius:18px; box-shadow:0 8px 20px rgba(30,41,59,.06); }
        .lp-service-btn { border:none; cursor:pointer; border-radius:14px; background:#fff; padding:14px 8px; display:flex; flex-direction:column; align-items:center; gap:8px; box-shadow:0 6px 16px rgba(15,23,42,.06); }
      `}</style>

      <nav className="lp-nav" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 900, color: "#0f172a", letterSpacing: -0.4 }}>⚡ KroEasy</div>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{isHi ? "Premium local services" : "Premium local services"}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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

      {!bannerDismissed && (
        <div style={{ margin: "12px 12px 0", padding: "10px 12px", borderRadius: 14, background: "linear-gradient(135deg,#4338ca,#7c3aed)", color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📍</span>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
            {isHi ? "नवरोज़ाबाद और बीरसिंहपुर पाली में trusted local workers उपलब्ध" : "Trusted local workers available in Nowrozabad & Birshingpur Pali"}
          </div>
          <button onClick={() => setBannerDismissed(true)} style={{ border: "1px solid rgba(255,255,255,.45)", background: "rgba(255,255,255,.18)", color: "#fff", borderRadius: 18, padding: "3px 9px", fontSize: 11, cursor: "pointer" }}>✕</button>
        </div>
      )}

      <section style={{ padding: "16px 12px 0" }}>
        <div className="lp-card" style={{ overflow: "hidden", background: "#0f172a" }}>
          <div className="lp-slider-track" style={{ transform: `translateX(-${activePromo * 100}%)` }}>
            {PROMO_BANNERS.map((banner) => (
              <button key={banner.titleEn} onClick={() => navigate(banner.to)} style={{ flex: "0 0 100%", border: "none", padding: 0, textAlign: "left", cursor: "pointer", background: "transparent" }}>
                <div style={{ minHeight: 210, backgroundImage: `linear-gradient(95deg,rgba(2,6,23,.86) 0%,rgba(2,6,23,.62) 50%,rgba(2,6,23,.22) 100%), url(${banner.image})`, backgroundSize: "cover", backgroundPosition: "center", padding: "16px 14px", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", maxWidth: 220 }}>
                    <div style={{ fontSize: 21, lineHeight: 1.15, color: "#fff", fontWeight: 900, letterSpacing: -0.2 }}>{isHi ? banner.titleHi : banner.titleEn}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.92)", marginTop: 5, fontWeight: 600, lineHeight: 1.35 }}>{isHi ? banner.subtitleHi : banner.subtitleEn}</div>
                    <div style={{ marginTop: 12, display: "inline-flex", background: "#0ea5e9", color: "#fff", borderRadius: 999, fontSize: 12, fontWeight: 800, padding: "6px 12px" }}>
                      {isHi ? "अभी देखें" : "Explore now"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
          {PROMO_BANNERS.map((_, i) => (
            <button key={i} onClick={() => setActivePromo(i)} style={{ width: activePromo === i ? 24 : 9, height: 9, border: "none", borderRadius: 999, background: activePromo === i ? "#1d4ed8" : "#cbd5e1", cursor: "pointer", transition: "all .2s ease", padding: 0 }} />
          ))}
        </div>
      </section>

      <section style={{ padding: "26px 14px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: "all .45s ease" }}>
        <div style={{ padding: "2px 2px 0" }}>
          <div className="lp-chip">● {isHi ? "25+ भरोसेमंद प्रोफाइल" : "25+ trusted profiles"}</div>
          <h1 style={{ margin: "12px 0 8px", fontSize: 32, lineHeight: 1.15, letterSpacing: -0.7, color: "#0f172a" }}>
            {isHi ? "घर के काम के लिए सही लोग" : "Right experts for your home"}
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
            <Link to="/register" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ marginTop: 10, background: "linear-gradient(135deg,#f97316,#ef4444)" }}>{isHi ? "Worker के रूप में Register" : "Register as Worker"}</button></Link>
          </div>
          <div className="lp-card" style={{ padding: "14px" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{isHi ? "गाड़ी मालिक हो?" : "Do you own a Car?"}</div>
            <div style={{ marginTop: 5, color: "#64748b", fontSize: 12, lineHeight: 1.5 }}>{isHi ? "अपनी गाड़ी list करें और local bookings पाएं।" : "List your car and get local bookings."}</div>
            <Link to="/register" style={{ textDecoration: "none" }}><button className="lp-cta" style={{ marginTop: 10, background: "linear-gradient(135deg,#1d4ed8,#4338ca)" }}>{isHi ? "Car Owner के रूप में Register" : "Register as Car Owner"}</button></Link>
          </div>
        </div>
      </section>

      <footer style={{ margin: "28px 12px 0", background: "linear-gradient(145deg,#0f172a,#1e293b)", color: "#cbd5e1", borderRadius: 20, padding: "18px 14px 78px" }}>
        <div style={{ fontSize: 20, color: "#fff", fontWeight: 900 }}>⚡ KroEasy</div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.6 }}>
          {isHi ? "Trusted local services platform for homes and daily needs." : "Trusted local services platform for homes and daily needs."}
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
