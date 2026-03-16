import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import InstallPrompt from "../components/InstallPrompt";
import BottomNav from "../components/BottomNav";
import api from "../api";

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
      if (cur >= end) {
        setVal(end);
        clearInterval(iv);
      } else setVal(cur);
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
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setInView(true);
      },
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

const SERVICES = [
  {
    icon: "⚡",
    lk: "skillElectrician",
    value: "Electrician",
    color: "#FFF3E0",
    accent: "#FF8F00",
  },
  {
    icon: "🔧",
    lk: "skillPlumber",
    value: "Plumber",
    color: "#E3F2FD",
    accent: "#1565C0",
  },
  {
    icon: "🪚",
    lk: "skillCarpenter",
    value: "Carpenter",
    color: "#FBE9E7",
    accent: "#BF360C",
  },
  {
    icon: "❄️",
    lk: "skillAcRepair",
    value: "AC Technician",
    color: "#E0F7FA",
    accent: "#00838F",
  },
  {
    icon: "🧱",
    lk: "skillMason",
    value: "Mason",
    color: "#F3E5F5",
    accent: "#6A1B9A",
  },
  {
    icon: "💇",
    lk: "skillBeautician",
    value: "Beautician",
    color: "#FCE4EC",
    accent: "#AD1457",
  },
  {
    icon: "🌸",
    lk: "skillMehndi",
    value: "Mehndi Artist",
    color: "#F9FBE7",
    accent: "#558B2F",
  },
  {
    icon: "🤝",
    lk: "skillHelper",
    value: "Helper",
    color: "#E8F5E9",
    accent: "#2E7D32",
  },
];

const CATEGORIES = [
  {
    icon: "🔧",
    label: "Home Repair",
    sub: "Electrician & Plumber",
    color: "#EEF2FF",
    accent: "#4F46E5",
    to: "/services",
  },
  {
    icon: "🚗",
    label: "Car Booking",
    sub: "Taxi & Rides",
    color: "#FFF7ED",
    accent: "#EA580C",
    to: "/services?tab=cars",
  },
  {
    icon: "💇",
    label: "Beauty",
    sub: "Mehndi & Beautician",
    color: "#FDF2F8",
    accent: "#DB2777",
    to: "/services?skill=Beautician",
  },
  {
    icon: "❄️",
    label: "Appliance",
    sub: "AC & Repair",
    color: "#ECFEFF",
    accent: "#0891B2",
    to: "/services?skill=AC Technician",
  },
  {
    icon: "🧱",
    label: "Construction",
    sub: "Mason & Carpenter",
    color: "#FFF8F1",
    accent: "#D97706",
    to: "/services?skill=Mason",
  },
  {
    icon: "🤝",
    label: "Helpers",
    sub: "Daily Assistance",
    color: "#F0FDF4",
    accent: "#16A34A",
    to: "/services?skill=Helper",
  },
];

const HIGHLIGHTS = [
  {
    icon: "✨",
    label: "NEW",
    title: "Book Instantly",
    sub: "Get worker in 60 min",
    color: "#6366F1",
  },
  {
    icon: "🌟",
    label: "HOT",
    title: "Free Listing",
    sub: "Register as provider",
    color: "#F59E0B",
  },
  {
    icon: "🚗",
    label: "RIDE",
    title: "Car Booking",
    sub: "Verified drivers",
    color: "#10B981",
  },
  {
    icon: "⭐",
    label: "TOP",
    title: "Rated Workers",
    sub: "5-star service",
    color: "#EF4444",
  },
  {
    icon: "🔒",
    label: "SAFE",
    title: "Verified Pros",
    sub: "ID checked",
    color: "#8B5CF6",
  },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const [shareMsg, setShareMsg] = useState("");
  const [cycleIdx, setCycleIdx] = useState(0);
  const [carouselWorkers, setCarouselWorkers] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef);

  const [users, startUsers] = useCounter(100);
  const [jobs, startJobs] = useCounter(12);
  const [providers, startProviders] = useCounter(15);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    // Fetch workers for carousel
    api.get("/labours?limit=20").then((res) => {
      const list = res.data?.data || res.data?.workers || res.data?.labours || [];
      if (Array.isArray(list) && list.length > 0) setCarouselWorkers(list);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (statsInView) {
      startUsers();
      startJobs();
      startProviders();
    }
  }, [statsInView]);

  const cycleItems = [
    { icon: "🚗", text: t("heroCta2") },
    { icon: "⚡", text: t("skillElectrician") },
    { icon: "🔧", text: t("skillPlumber") },
    { icon: "❄️", text: t("skillAcRepair") },
    { icon: "💇", text: t("skillBeautician") },
    { icon: "🧱", text: t("skillMason") },
    { icon: "🤝", text: t("skillHelper") },
  ];
  useEffect(() => {
    const iv = setInterval(
      () => setCycleIdx((i) => (i + 1) % cycleItems.length),
      1800,
    );
    return () => clearInterval(iv);
  }, [cycleItems.length]);

  const handleShare = async () => {
    const shareData = {
      title: "⚡ KroEasy",
      text: "Apne sheher ke verified workers aur cars ek app pe. Bilkul free!",
      url: "https://kroeasy.com",
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(shareData.url);
        setShareMsg(t("linkCopied"));
        setTimeout(() => setShareMsg(""), 2500);
      } catch {}
    }
  };

  return (
    <div
      className="page-container"
      style={{
        paddingBottom: "80px",
        overflow: "hidden",
        background: "#F8FAFF",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.6)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes marqueeRTL { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .lp-body { font-family:'Inter',sans-serif; }
        .lp-section-title { font-size:19px; font-weight:800; color:#0F172A; letter-spacing:-0.3px; }
        .lp-section-sub { font-size:12px; color:#94A3B8; font-weight:500; margin-top:2px; }
        .lp-card { background:white; border-radius:18px; box-shadow:0 2px 16px rgba(0,0,0,.06); border:1px solid #F1F5F9; transition:transform .15s,box-shadow .15s; cursor:pointer; }
        .lp-card:active { transform:scale(0.96); box-shadow:0 1px 8px rgba(0,0,0,.08); }
        .service-pill { transition: transform .12s; }
        .service-pill:active { transform: scale(0.91) !important; }
        .hero-gradient { background: linear-gradient(135deg,#EEF2FF 0%,#DBEAFE 40%,#E0F2FE 100%); }
        .cat-card:hover { transform:translateY(-2px); box-shadow:0 6px 24px rgba(0,0,0,.10); }
        .cat-card { transition:transform .2s,box-shadow .2s; }
        .scroll-row { display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
        .scroll-row::-webkit-scrollbar { display:none; }
        .highlight-chip { flex-shrink:0; width:130px; border-radius:16px; overflow:hidden; cursor:pointer; transition:transform .15s; }
        .highlight-chip:active { transform:scale(0.95); }
        .btn-orange-gradient { background:linear-gradient(135deg,#F97316,#EF4444); color:white; border:none; border-radius:14px; cursor:pointer; font-weight:800; transition:box-shadow .2s,transform .15s; }
        .btn-orange-gradient:active { transform:scale(0.97); }
        .badge-live { display:inline-flex;align-items:center;gap:5px;background:#ECFDF5;border:1px solid #A7F3D0;border-radius:20px;padding:4px 12px;font-size:11px;color:#059669;font-weight:700; }
        .tab-btn { padding:7px 18px; border-radius:20px; font-size:13px; font-weight:600; border:1.5px solid #E2E8F0; background:white; color:#64748B; cursor:pointer; transition:all .15s; }
        .tab-btn.active { background:#4F46E5; color:white; border-color:#4F46E5; }
        /* Navbar light styles */
        .lp-navbar { background:white; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; position:sticky; top:0; z-index:50; border-bottom:1px solid #F1F5F9; box-shadow:0 1px 0 #E2E8F0,0 2px 10px rgba(0,0,0,.05); }
        .lp-logo-text { font-size:20px; font-weight:900; color:#0F172A; letter-spacing:-0.5px; }
        .lp-logo-sub { font-size:10px; color:#94A3B8; font-weight:500; }
        .lp-nav-icon-btn { width:33px; height:33px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1.5px solid #E2E8F0; background:white; cursor:pointer; font-size:14px; font-weight:700; color:#374151; transition:all .15s; }
        .lp-nav-icon-btn:active { background:#F1F5F9; }
        .lp-nav-login { padding:7px 14px; background:#EEF2FF; border:1.5px solid #C7D2FE; border-radius:10px; color:#4338CA; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all .15s; }
        .lp-nav-login:active { background:#E0E7FF; }
        .lp-nav-register { padding:7px 14px; background:linear-gradient(135deg,#F97316,#EF4444); border:none; border-radius:10px; color:white; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; box-shadow:0 2px 10px rgba(249,115,22,.3); transition:all .15s; }
        .lp-nav-register:active { opacity:.9; }
        .lp-nav-dashboard { padding:7px 14px; background:linear-gradient(135deg,#4F46E5,#6366F1); border:none; border-radius:10px; color:white; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap; box-shadow:0 2px 10px rgba(79,70,229,.25); }
        /* Bottom tab bar */
        .lp-bottom-tab { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:white; border-top:1px solid #E2E8F0; display:flex; z-index:50; box-shadow:0 -4px 20px rgba(0,0,0,.08); }
        .lp-tab-item { flex:1; display:flex; flex-direction:column; align-items:center; padding:9px 4px 7px; cursor:pointer; border:none; background:none; color:#94A3B8; font-size:10px; font-weight:600; gap:3px; transition:color .15s; text-decoration:none; }
        .lp-tab-item.active { color:#4F46E5; }
        .lp-tab-item:active { opacity:.7; }
        .lp-tab-icon { font-size:20px; line-height:1; }
        .lp-tab-indicator { width:20px; height:3px; background:#4F46E5; border-radius:3px; margin-top:2px; }
        /* Workers Carousel */
        .workers-marquee-wrap { overflow:hidden; position:relative; }
        .workers-marquee-wrap::before, .workers-marquee-wrap::after { content:''; position:absolute; top:0; bottom:0; width:50px; z-index:2; pointer-events:none; }
        .workers-marquee-wrap::before { left:0; background:linear-gradient(to right,#F0F4FF,transparent); }
        .workers-marquee-wrap::after { right:0; background:linear-gradient(to left,#F0F4FF,transparent); }
        .workers-marquee-track { display:flex; gap:16px; width:max-content; animation:marqueeRTL 32s linear infinite; padding:6px 2px 14px; }
        .workers-marquee-track:hover { animation-play-state:paused; }
        .worker-carousel-card { flex-shrink:0; width:182px; height:260px; border-radius:24px; border:none; padding:18px 16px 14px; cursor:pointer; transition:transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s; position:relative; overflow:hidden; display:flex; flex-direction:column; }
        .worker-carousel-card:hover { transform:translateY(-5px) scale(1.02); }
        @keyframes availPulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.5)} 70%{box-shadow:0 0 0 5px rgba(16,185,129,0)} }
        .avail-dot-pulse { animation: availPulse 2s ease-in-out infinite; }
      `}</style>

      <div className="lp-body">
        {/* ══ NAVBAR (light premium) ══════════════════════════════════════════════ */}
        <div className="lp-navbar">
          {/* Logo */}
          <div>
            <div className="lp-logo-text">⚡ KroEasy</div>
            <div className="lp-logo-sub">{t("landingTagline")}</div>
          </div>
          {/* Right controls */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {/* Language toggle */}
            <button
              className="lp-nav-icon-btn"
              onClick={() => switchLang(lang === "en" ? "hi" : "en")}
              title="Switch Language"
            >
              {lang === "en" ? "🇮🇳" : "EN"}
            </button>
            {/* Share */}
            <div style={{ position: "relative" }}>
              <button
                className="lp-nav-icon-btn"
                onClick={handleShare}
                title="Share KroEasy"
              >
                📤
              </button>
              {shareMsg && (
                <div
                  style={{
                    position: "absolute",
                    top: "110%",
                    right: 0,
                    background: "#1E293B",
                    color: "white",
                    fontSize: "11px",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    whiteSpace: "nowrap",
                    zIndex: 100,
                  }}
                >
                  {shareMsg}
                </div>
              )}
            </div>
            {/* Auth button — conditional */}
            {user ? (
              <Link to="/dashboard" style={{ textDecoration: "none" }}>
                <button className="lp-nav-dashboard">{t("dashboard")} →</button>
              </Link>
            ) : (
              <>
                <Link to="/login" style={{ textDecoration: "none" }}>
                  <button className="lp-nav-login">{t("login")}</button>
                </Link>
                <Link to="/register" style={{ textDecoration: "none" }}>
                  <button className="lp-nav-register">{t("register")}</button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ══ HERO / BANNER ═══════════════════════════════════════════════════ */}
        <div
          className="hero-gradient"
          style={{
            padding: "28px 20px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Decorative blobs */}
          <div
            style={{
              position: "absolute",
              top: "-60px",
              right: "-60px",
              width: "220px",
              height: "220px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-40px",
              left: "-40px",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(59,130,246,.1),transparent 70%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "30%",
              right: "15%",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#6366F1",
              opacity: 0.4,
              animation: "float 3s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "20%",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#F59E0B",
              opacity: 0.5,
              animation: "float 4s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(24px)",
              transition: "all .7s cubic-bezier(.16,1,.3,1)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {/* Live badge */}
            <div className="badge-live" style={{ marginBottom: "14px" }}>
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10B981",
                  animation: "pulse 1.5s infinite",
                  display: "inline-block",
                }}
              />
              {providers}+ {t("heroTrust")}
            </div>

            {/* H1 */}
            <h1
              style={{
                fontSize: "26px",
                fontWeight: "900",
                lineHeight: "1.25",
                marginBottom: "8px",
                color: "#0F172A",
                letterSpacing: "-0.5px",
              }}
            >
              {t("heroH1a")}
              <br />
              <span style={{ color: "#4F46E5" }}>{t("heroH1b")}</span>
            </h1>

            {/* Cycling service */}
            <div style={{ marginBottom: "20px", minHeight: "50px" }}>
              <div
                key={cycleIdx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  marginTop: "6px",
                  gap: "10px",
                  background: "white",
                  border: "1.5px solid #E0E7FF",
                  borderRadius: "14px",
                  padding: "8px 18px",
                  fontSize: "16px",
                  fontWeight: "800",
                  color: "#312E81",
                  boxShadow: "0 4px 12px rgba(99,102,241,.12)",
                  animation: "fadeUp .35s ease forwards",
                }}
              >
                <span style={{ fontSize: "22px" }}>
                  {cycleItems[cycleIdx]?.icon}
                </span>
                {cycleItems[cycleIdx]?.text}
              </div>
            </div>

            {/* CTAs */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "100%",
                maxWidth: "320px",
                margin: "0 auto",
              }}
            >
              <Link to="/services" style={{ textDecoration: "none" }}>
                <button
                  className="btn-orange-gradient"
                  aria-label="Book services in Nowrozabad"
                  style={{
                    width: "100%",
                    padding: "15px",
                    fontSize: "16px",
                    boxShadow: "0 6px 20px rgba(249,115,22,.35)",
                  }}
                >
                  {t("heroCta1")} →
                </button>
              </Link>
              <Link to="/services?tab=cars" style={{ textDecoration: "none" }}>
                <button
                  aria-label="Book car taxi in Nowrozabad"
                  style={{
                    width: "100%",
                    padding: "13px",
                    fontSize: "14px",
                    fontWeight: "700",
                    background: "white",
                    border: "1.5px solid #E0E7FF",
                    borderRadius: "12px",
                    color: "#4F46E5",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(99,102,241,.1)",
                  }}
                >
                  🚗 {t("heroCta2")}
                </button>
              </Link>
            </div>
          </div>
        </div>



        {/* ══ STATS BAR ═══════════════════════════════════════════════════════ */}
        <div
          ref={statsRef}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            background: "white",
            padding: "14px 8px",
            borderBottom: "1px solid #F1F5F9",
            boxShadow: "0 2px 8px rgba(0,0,0,.04)",
          }}
        >
          {[
            {
              val: `${users}+`,
              label: t("statUsers"),
              color: "#4F46E5",
              bg: "#EEF2FF",
              icon: "😊",
            },
            {
              val: `${jobs}+`,
              label: t("statJobs"),
              color: "#059669",
              bg: "#ECFDF5",
              icon: "✅",
            },
            {
              val: `${providers}+`,
              label: t("statWorkers"),
              color: "#EA580C",
              bg: "#FFF7ED",
              icon: "🔧",
            },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "4px 0" }}>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: s.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 4px",
                  fontSize: "18px",
                }}
              >
                {s.icon}
              </div>
              <div
                style={{ fontSize: "20px", fontWeight: "900", color: s.color }}
              >
                {s.val}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  color: "#94A3B8",
                  fontWeight: "600",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ══ WORKERS CAROUSEL ══════════════════════════════════════════════ */}
        {(() => {
          const FALLBACK_WORKERS = [
            { _id: "f1", userId: { name: "Ramesh Kumar" }, skills: ["Electrician"], city: "Nowrozabad", availability: true, experience: 5, rating: 4.8, reviewCount: 32 },
            { _id: "f2", userId: { name: "Sunita Devi" }, skills: ["Beautician", "Mehndi Artist"], city: "Nowrozabad", availability: true, experience: 3, rating: 4.6, reviewCount: 19 },
            { _id: "f3", userId: { name: "Anil Sharma" }, skills: ["Plumber"], city: "Nowrozabad", availability: false, experience: 7, rating: 4.5, reviewCount: 44 },
            { _id: "f4", userId: { name: "Priya Yadav" }, skills: ["Helper"], city: "Nowrozabad", availability: true, experience: 2, rating: 4.7, reviewCount: 11 },
            { _id: "f5", userId: { name: "Vikram Singh" }, skills: ["AC Technician"], city: "Nowrozabad", availability: true, experience: 6, rating: 4.9, reviewCount: 58 },
            { _id: "f6", userId: { name: "Meena Bai" }, skills: ["Mehndi Artist"], city: "Nowrozabad", availability: true, experience: 4, rating: 4.7, reviewCount: 27 },
            { _id: "f7", userId: { name: "Raju Vishwakarma" }, skills: ["Carpenter", "Mason"], city: "Nowrozabad", availability: false, experience: 9, rating: 4.4, reviewCount: 63 },
            { _id: "f8", userId: { name: "Kavita Patel" }, skills: ["Beautician"], city: "Nowrozabad", availability: true, experience: 5, rating: 4.8, reviewCount: 36 },
          ];
          const SKILL_META = {
            "Electrician":  { bg: "linear-gradient(135deg,#FFF3E0,#FFE0B2)", accent: "#FF8F00", cardGrad: "linear-gradient(145deg,#FFFBF0,#FFF3E0)", icon: "⚡" },
            "Plumber":      { bg: "linear-gradient(135deg,#E3F2FD,#BBDEFB)", accent: "#1565C0", cardGrad: "linear-gradient(145deg,#F0F8FF,#E3F2FD)", icon: "🔧" },
            "Carpenter":    { bg: "linear-gradient(135deg,#FBE9E7,#FFCCBC)", accent: "#BF360C", cardGrad: "linear-gradient(145deg,#FFF5F3,#FBE9E7)", icon: "🪚" },
            "AC Technician":{ bg: "linear-gradient(135deg,#E0F7FA,#B2EBF2)", accent: "#00838F", cardGrad: "linear-gradient(145deg,#F0FFFE,#E0F7FA)", icon: "❄️" },
            "Mason":        { bg: "linear-gradient(135deg,#F3E5F5,#E1BEE7)", accent: "#6A1B9A", cardGrad: "linear-gradient(145deg,#FAF5FF,#F3E5F5)", icon: "🧱" },
            "Beautician":   { bg: "linear-gradient(135deg,#FCE4EC,#F8BBD9)", accent: "#AD1457", cardGrad: "linear-gradient(145deg,#FFF5F8,#FCE4EC)", icon: "💇" },
            "Mehndi Artist":{ bg: "linear-gradient(135deg,#F9FBE7,#F0F4C3)", accent: "#558B2F", cardGrad: "linear-gradient(145deg,#FDFFF0,#F9FBE7)", icon: "🌸" },
            "Helper":       { bg: "linear-gradient(135deg,#E8F5E9,#C8E6C9)", accent: "#2E7D32", cardGrad: "linear-gradient(145deg,#F3FFF4,#E8F5E9)", icon: "🤝" },
          };
          const AVATAR_GRADIENTS = [
            "linear-gradient(135deg,#667eea,#764ba2)",
            "linear-gradient(135deg,#f093fb,#f5576c)",
            "linear-gradient(135deg,#4facfe,#00f2fe)",
            "linear-gradient(135deg,#43e97b,#38f9d7)",
            "linear-gradient(135deg,#fa709a,#fee140)",
            "linear-gradient(135deg,#a18cd1,#fbc2eb)",
            "linear-gradient(135deg,#ff9a9e,#fecfef)",
            "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
          ];
          const workers = carouselWorkers.length > 0 ? carouselWorkers : FALLBACK_WORKERS;
          const doubled = [...workers, ...workers];
          return (
            <div style={{ background: "linear-gradient(180deg,#F0F4FF 0%,#F8FAFF 100%)", padding: "26px 0 28px", marginTop: "8px" }}>
              {/* Section header */}
              <div style={{ padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: "900", color: "#0F172A", letterSpacing: "-0.4px", lineHeight: 1.2 }}>👷 Meet Our Workers</div>
                  <div style={{ fontSize: "12px", color: "#64748B", fontWeight: "500", marginTop: "3px" }}>Verified professionals · Auto-scrolling</div>
                </div>
                <Link to="/services" style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "white", background: "linear-gradient(135deg,#4F46E5,#6366F1)", padding: "6px 14px", borderRadius: "20px", boxShadow: "0 3px 10px rgba(79,70,229,.3)" }}>See All →</div>
                </Link>
              </div>
              {/* Marquee */}
              <div className="workers-marquee-wrap">
                <div className="workers-marquee-track">
                  {doubled.map((w, idx) => {
                    const name = w.userId?.name || w.name || "Worker";
                    const skills = w.skills || [];
                    const rawSkill = skills[0] || "Helper";
                    // Normalise: if the skill is too long to be a standard label, treat as unknown
                    const KNOWN_SKILLS = ["Electrician","Plumber","Carpenter","AC Technician","Mason","Beautician","Mehndi Artist","Helper"];
                    const primarySkill = KNOWN_SKILLS.includes(rawSkill) ? rawSkill : "Helper";
                    // Display label truncated to keep pill compact
                    const skillLabel = rawSkill.length > 14 ? rawSkill.slice(0, 13) + "…" : rawSkill;
                    const sm = SKILL_META[primarySkill] || SKILL_META["Helper"];
                    const grad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                    const initials = name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                    const isAvail = w.availability !== false;
                    const rating = typeof w.rating === "number" ? w.rating : 0;
                    const exp = w.experience || 0;
                    const stars = Math.round(rating);
                    return (
                      <div
                        key={`${w._id}-${idx}`}
                        className="worker-carousel-card"
                        style={{ background: sm.cardGrad, boxShadow: `0 6px 24px ${sm.accent}18` }}
                        onClick={() => navigate("/services")}
                      >
                        {/* Decorative blob */}
                        <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "80px", height: "80px", borderRadius: "50%", background: sm.accent, opacity: 0.07, pointerEvents: "none" }} />
                        {/* Availability badge - top right */}
                        <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", alignItems: "center", gap: "4px", background: isAvail ? "#ECFDF5" : "#F8FAFC", border: `1px solid ${isAvail ? "#A7F3D0" : "#E2E8F0"}`, borderRadius: "20px", padding: "3px 8px 3px 5px" }}>
                          <span className={isAvail ? "avail-dot-pulse" : ""} style={{ width: "6px", height: "6px", borderRadius: "50%", background: isAvail ? "#10B981" : "#CBD5E1", display: "inline-block", flexShrink: 0 }} />
                          <span style={{ fontSize: "9px", fontWeight: "700", color: isAvail ? "#059669" : "#94A3B8", lineHeight: 1 }}>{isAvail ? "Free" : "Busy"}</span>
                        </div>
                        {/* Avatar */}
                        <div style={{ position: "relative", width: "56px", height: "56px", marginBottom: "12px" }}>
                          <div style={{ position: "absolute", inset: "-3px", borderRadius: "50%", background: sm.bg, zIndex: 0 }} />
                          {w.profileImage ? (
                            <img src={w.profileImage} alt={name} style={{ position: "relative", zIndex: 1, width: "56px", height: "56px", borderRadius: "50%", objectFit: "cover", border: "2.5px solid white" }} />
                          ) : (
                            <div style={{ position: "relative", zIndex: 1, width: "56px", height: "56px", borderRadius: "50%", background: grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: "900", color: "white", border: "2.5px solid white", boxShadow: "0 3px 10px rgba(0,0,0,.18)" }}>
                              {initials}
                            </div>
                          )}
                          {/* Skill icon badge */}
                          <div style={{ position: "absolute", bottom: "-4px", right: "-4px", width: "22px", height: "22px", borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", boxShadow: "0 2px 6px rgba(0,0,0,.15)", zIndex: 2 }}>
                            {sm.icon}
                          </div>
                        </div>
                        {/* Name */}
                        <div style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "2px", paddingRight: "32px" }}>{name}</div>
                        {/* City */}
                        <div style={{ fontSize: "10px", color: "#94A3B8", fontWeight: "500", marginBottom: "10px", display: "flex", alignItems: "center", gap: "3px" }}>
                          <span style={{ color: sm.accent }}>📍</span> {w.userId?.city || w.city || "Nowrozabad"}
                        </div>
                        {/* Skill pill — fixed height container so card height never varies */}
                        <div style={{ height: "30px", display: "flex", gap: "4px", alignItems: "center", marginBottom: "10px", overflow: "hidden" }}>
                          <span style={{ display: "inline-block", background: sm.accent + "18", color: sm.accent, fontSize: "10px", fontWeight: "800", padding: "4px 10px", borderRadius: "20px", border: `1px solid ${sm.accent}30`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px" }}>
                            {skillLabel}
                          </span>
                          {skills.length > 1 && (
                            <span style={{ display: "inline-block", background: "#F1F5F9", color: "#64748B", fontSize: "10px", fontWeight: "600", padding: "4px 7px", borderRadius: "20px", flexShrink: 0 }}>+{skills.length - 1}</span>
                          )}
                        </div>
                        {/* Stars + exp */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                          <div style={{ display: "flex", gap: "1px" }}>
                            {[1,2,3,4,5].map(s => (
                              <span key={s} style={{ fontSize: "11px", color: s <= stars ? "#F59E0B" : "#E2E8F0" }}>★</span>
                            ))}
                            {rating > 0 && <span style={{ fontSize: "10px", color: "#64748B", fontWeight: "700", marginLeft: "3px" }}>{rating.toFixed(1)}</span>}
                          </div>
                          <span style={{ fontSize: "10px", color: "#64748B", fontWeight: "600", background: "rgba(255,255,255,.8)", padding: "2px 7px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                            {exp}y exp
                          </span>
                        </div>
                        {/* Book CTA — pushed to bottom via flex-grow spacer */}
                        <div style={{ flex: 1 }} />
                        <div style={{ background: `linear-gradient(135deg,${sm.accent},${sm.accent}CC)`, color: "white", fontSize: "11px", fontWeight: "800", textAlign: "center", padding: "7px", borderRadius: "12px", boxShadow: `0 3px 10px ${sm.accent}40`, letterSpacing: "0.2px", flexShrink: 0 }}>
                          Book Now →
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ HIGHLIGHTS (horizontal scroll) ════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px 12px",
            background: "white",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <div className="lp-section-title">✨ What's New</div>
              <div className="lp-section-sub">Latest on KroEasy</div>
            </div>
          </div>
          <div className="scroll-row">
            {HIGHLIGHTS.map((h, i) => (
              <div
                key={i}
                className="highlight-chip"
                style={{
                  background: `linear-gradient(145deg,${h.color}15,${h.color}08)`,
                  border: `1px solid ${h.color}22`,
                }}
              >
                <div style={{ padding: "14px 12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <span style={{ fontSize: "28px" }}>{h.icon}</span>
                    <span
                      style={{
                        fontSize: "9px",
                        fontWeight: "800",
                        background: h.color,
                        color: "white",
                        borderRadius: "6px",
                        padding: "2px 7px",
                        letterSpacing: ".5px",
                      }}
                    >
                      {h.label}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "800",
                      color: "#0F172A",
                      marginBottom: "2px",
                    }}
                  >
                    {h.title}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#64748B",
                      fontWeight: "500",
                    }}
                  >
                    {h.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ SERVICE CATEGORIES (Jio-style grid) ═══════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "#F8FAFF",
            marginTop: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <div>
              <div className="lp-section-title">🏠 Our Services</div>
              <div className="lp-section-sub">Find what you need</div>
            </div>
            <Link
              to="/services"
              style={{
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "700",
                color: "#4F46E5",
              }}
            >
              See All →
            </Link>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {CATEGORIES.map((cat, i) => (
              <Link key={i} to={cat.to} style={{ textDecoration: "none" }}>
                <div
                  className="lp-card cat-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "14px",
                      background: cat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      flexShrink: 0,
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "800",
                        color: "#0F172A",
                        letterSpacing: "-0.2px",
                      }}
                    >
                      {cat.label}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#94A3B8",
                        fontWeight: "500",
                        marginTop: "2px",
                      }}
                    >
                      {cat.sub}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ══ QUICK LINKS (icon grid like Jio) ══════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "white",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <div className="lp-section-title">⚡ Quick Links</div>
            <div className="lp-section-sub">Jump right in</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "8px",
            }}
          >
            {SERVICES.map((s) => (
              <Link
                to={`/services?skill=${encodeURIComponent(s.value)}`}
                key={s.value}
                style={{ textDecoration: "none" }}
              >
                <div
                  className="service-pill"
                  style={{
                    textAlign: "center",
                    padding: "12px 4px",
                    background: "white",
                    borderRadius: "16px",
                    border: "1.5px solid #F1F5F9",
                    boxShadow: "0 2px 8px rgba(0,0,0,.05)",
                    transition: "transform .12s",
                  }}
                  onMouseDown={(e) =>
                    (e.currentTarget.style.transform = "scale(0.92)")
                  }
                  onMouseUp={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      background: s.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      margin: "0 auto 6px",
                    }}
                  >
                    {s.icon}
                  </div>
                  <div
                    style={{
                      fontSize: "9.5px",
                      fontWeight: "700",
                      color: "#334155",
                      lineHeight: "1.3",
                    }}
                  >
                    {t(s.lk)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ══ WHO IS THIS FOR ════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "#F8FAFF",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <div className="lp-section-title">🤔 {t("whyTitle")}</div>
            <div className="lp-section-sub">{t("whySub")}</div>
          </div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {[
              {
                emoji: "👨‍👩‍👧",
                titleK: "for_customer_title",
                descK: "for_customer_desc",
                btnK: "for_customer_btn",
                to: "/services",
                accentBg: "#EEF2FF",
                accentBorder: "#C7D2FE",
                tc: "#4338CA",
                btnBg: "linear-gradient(135deg,#4F46E5,#6366F1)",
              },
              {
                emoji: "🔧",
                titleK: "for_worker_title",
                descK: "for_worker_desc",
                btnK: "for_worker_btn",
                to: "/register?role=labour",
                accentBg: "#ECFDF5",
                accentBorder: "#A7F3D0",
                tc: "#059669",
                btnBg: "linear-gradient(135deg,#059669,#10B981)",
              },
              {
                emoji: "🚗",
                titleK: "for_car_title",
                descK: "for_car_desc",
                btnK: "for_car_btn",
                to: "/register?role=carowner",
                accentBg: "#FFF7ED",
                accentBorder: "#FED7AA",
                tc: "#EA580C",
                btnBg: "linear-gradient(135deg,#EA580C,#F97316)",
              },
            ].map((c, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  padding: "16px",
                  display: "flex",
                  gap: "14px",
                  alignItems: "flex-start",
                  border: `1.5px solid ${c.accentBorder}`,
                  background: "white",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background: c.accentBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    flexShrink: 0,
                  }}
                >
                  {c.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "800",
                      color: c.tc,
                      marginBottom: "4px",
                    }}
                  >
                    {t(c.titleK)}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "#475569",
                      lineHeight: "1.6",
                      marginBottom: "10px",
                    }}
                  >
                    {t(c.descK)}
                  </div>
                  <Link to={c.to} style={{ textDecoration: "none" }}>
                    <button
                      style={{
                        padding: "7px 16px",
                        background: c.btnBg,
                        border: "none",
                        borderRadius: "20px",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        boxShadow: `0 4px 12px ${c.tc}30`,
                      }}
                    >
                      {t(c.btnK)}
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "white",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "16px", textAlign: "center" }}>
            <div className="lp-section-title">📱 {t("howItWorksTitle")}</div>
            <div className="lp-section-sub">Simple 3-step process</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              maxWidth: "360px",
              margin: "0 auto",
            }}
          >
            {[
              {
                num: "1",
                icon: "🔍",
                tk: "step1Title",
                dk: "step1Desc",
                color: "#EEF2FF",
                accent: "#4F46E5",
              },
              {
                num: "2",
                icon: "📋",
                tk: "step2Title",
                dk: "step2Desc",
                color: "#FFF7ED",
                accent: "#EA580C",
              },
              {
                num: "3",
                icon: "📞",
                tk: "step3Title",
                dk: "step3Desc",
                color: "#ECFDF5",
                accent: "#059669",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "white",
                  padding: "16px",
                  borderRadius: "18px",
                  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    flexShrink: 0,
                    background: s.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    position: "relative",
                  }}
                >
                  {s.icon}
                  <div
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: s.accent,
                      color: "white",
                      fontSize: "10px",
                      fontWeight: "800",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s.num}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#0F172A",
                      marginBottom: "3px",
                    }}
                  >
                    {t(s.tk)}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                      lineHeight: "1.5",
                    }}
                  >
                    {t(s.dk)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ TESTIMONIALS ═══════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "#F8FAFF",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <div className="lp-section-title">⭐ {t("testimonialsTitle")}</div>
            <div className="lp-section-sub">What our users say</div>
          </div>
          <div className="scroll-row">
            {[
              {
                name: "रमेश कुमार",
                city: "नौरोजाबाद",
                stars: 5,
                text: "बहुत बढ़िया! Electrician 1 घंटे में आए, काम भी अच्छा हुआ।",
                color: "#EEF2FF",
                tc: "#4338CA",
              },
              {
                name: "Sunita Verma",
                city: "Birshingpur",
                stars: 5,
                text: "App easy hai, Hindi mein hai. Plumber ka number turant mila!",
                color: "#ECFDF5",
                tc: "#065F46",
              },
              {
                name: "राजेश पटेल",
                city: "रेवा",
                stars: 5,
                text: "मेरी car यहाँ list है — महीने में 3-4 booking आ जाती है।",
                color: "#FFF7ED",
                tc: "#92400E",
              },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: "230px",
                  background: "white",
                  borderRadius: "18px",
                  padding: "16px",
                  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      background: r.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: r.tc,
                      fontWeight: "800",
                      fontSize: "15px",
                      flexShrink: 0,
                    }}
                  >
                    {r.name[0]}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "13px",
                        color: "#0F172A",
                      }}
                    >
                      {r.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "#94A3B8" }}>
                      🏙️ {r.city}
                    </div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: "12px" }}>
                    {"⭐".repeat(r.stars)}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#475569",
                    lineHeight: "1.7",
                    margin: 0,
                    fontStyle: "italic",
                  }}
                >
                  "{r.text}"
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BEFORE / AFTER ═════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "white",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "14px", textAlign: "center" }}>
            <div className="lp-section-title">{t("beforeAfterTitle")}</div>
            <div className="lp-section-sub">The KroEasy difference</div>
          </div>
          <div
            style={{
              background: "#F8FAFF",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,.05)",
              border: "1px solid #E2E8F0",
            }}
          >
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  background: "#FEE2E2",
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#991B1B",
                }}
              >
                ❌ Before
              </div>
              <div
                style={{
                  padding: "12px",
                  textAlign: "center",
                  background: "#DCFCE7",
                  fontSize: "12px",
                  fontWeight: "800",
                  color: "#166534",
                }}
              >
                ✅ With KroEasy
              </div>
            </div>
            {[
              { ok: "compareOld1", nk: "compareNew1" },
              { ok: "compareOld2", nk: "compareNew2" },
              { ok: "compareOld3", nk: "compareNew3" },
              { ok: "compareOld4", nk: "compareNew4" },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderTop: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: "11px",
                    color: "#9F1239",
                    fontWeight: "600",
                    background: i % 2 === 0 ? "#FFF" : "#FFFBFB",
                    lineHeight: "1.5",
                  }}
                >
                  {t(r.ok)}
                </div>
                <div
                  style={{
                    padding: "10px 12px",
                    fontSize: "11px",
                    color: "#166534",
                    fontWeight: "600",
                    background: i % 2 === 0 ? "#FFF" : "#FAFFFE",
                    lineHeight: "1.5",
                    borderLeft: "1px solid #F1F5F9",
                  }}
                >
                  {t(r.nk)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ WORKER CTA ═════════════════════════════════════════════════════ */}
        <div
          style={{
            margin: "8px 16px 0",
            padding: "28px 20px",
            background: "linear-gradient(145deg,#312E81,#4F46E5)",
            borderRadius: "24px",
            textAlign: "center",
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 8px 32px rgba(79,70,229,.25)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "130px",
              height: "130px",
              borderRadius: "50%",
              background: "rgba(255,255,255,.06)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20px",
              left: "-20px",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "rgba(255,255,255,.04)",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                fontSize: "44px",
                marginBottom: "8px",
                animation: "float 3s ease-in-out infinite",
              }}
            >
              💼
            </div>
            <h3
              style={{
                fontSize: "20px",
                fontWeight: "900",
                marginBottom: "8px",
                letterSpacing: "-0.3px",
              }}
            >
              {t("workerCtaTitle")}
            </h3>
            <p
              style={{
                fontSize: "13px",
                opacity: 0.8,
                marginBottom: "18px",
                lineHeight: "1.6",
              }}
            >
              {t("workerCtaDesc")}
            </p>
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link to="/register?role=labour">
                <button
                  style={{
                    padding: "12px 22px",
                    fontSize: "14px",
                    fontWeight: "800",
                    background: "white",
                    color: "#4338CA",
                    border: "none",
                    borderRadius: "14px",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0,0,0,.15)",
                  }}
                >
                  {t("workerCtaBtn")}
                </button>
              </Link>
              <Link to="/register?role=carowner">
                <button
                  style={{
                    padding: "12px 22px",
                    fontSize: "14px",
                    fontWeight: "700",
                    background: "rgba(255,255,255,.12)",
                    border: "1.5px solid rgba(255,255,255,.25)",
                    borderRadius: "14px",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  {t("carOwnerCtaBtn")}
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ══ TRUST BADGES ══════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px",
            background: "#F8FAFF",
            marginTop: "8px",
          }}
        >
          <div style={{ marginBottom: "14px", textAlign: "center" }}>
            <div className="lp-section-title">🛡️ Why Trust Us</div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            {[
              {
                icon: "✅",
                tk: "trust1Title",
                dk: "trust1Desc",
                color: "#ECFDF5",
                tc: "#059669",
              },
              {
                icon: "⭐",
                tk: "trust2Title",
                dk: "trust2Desc",
                color: "#FEFCE8",
                tc: "#A16207",
              },
              {
                icon: "📞",
                tk: "trust3Title",
                dk: "trust3Desc",
                color: "#EFF6FF",
                tc: "#1D4ED8",
              },
              {
                icon: "🔒",
                tk: "trust4Title",
                dk: "trust4Desc",
                color: "#F5F3FF",
                tc: "#6D28D9",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  background: "white",
                }}
              >
                <div
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "50%",
                    background: f.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 8px",
                    fontSize: "22px",
                  }}
                >
                  {f.icon}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: "800",
                    color: f.tc,
                    marginBottom: "3px",
                  }}
                >
                  {t(f.tk)}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94A3B8",
                    lineHeight: "1.4",
                  }}
                >
                  {t(f.dk)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ FINAL CTA ══════════════════════════════════════════════════════ */}
        <div
          style={{
            padding: "20px 16px 12px",
            textAlign: "center",
            background: "white",
            marginTop: "8px",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "900",
              marginBottom: "6px",
              color: "#0F172A",
              letterSpacing: "-0.3px",
            }}
          >
            {t("finalCtaTitle")}
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "#64748B",
              marginBottom: "20px",
              lineHeight: "1.6",
            }}
          >
            {t("finalCtaDesc")}
          </p>
          <Link to="/services">
            <button
              className="btn-orange-gradient"
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "17px",
                boxShadow: "0 6px 24px rgba(249,115,22,.35)",
              }}
            >
              {t("browseServices")} →
            </button>
          </Link>
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <Link
              to="/register"
              style={{
                fontSize: "13px",
                color: "#4F46E5",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              {t("registerFree")}
            </Link>
            {!user && (
              <Link
                to="/login"
                style={{
                  fontSize: "13px",
                  color: "#94A3B8",
                  fontWeight: "500",
                  textDecoration: "none",
                }}
              >
                🔒 {t("login")}
              </Link>
            )}
          </div>
        </div>

        {/* ══ INSTALL BANNER ════════════════════════════════════════════════ */}
        <InstallPrompt />

        {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: "#0F172A",
            color: "white",
            padding: "28px 20px 20px",
            marginTop: "8px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "900",
                marginBottom: "4px",
                letterSpacing: "-0.5px",
              }}
            >
              ⚡ KroEasy
            </div>
            <div style={{ fontSize: "12px", opacity: 0.5 }}>
              Nowrozabad &amp; Birshingpur Pali
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  opacity: 0.4,
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                {t("footerServices")}
              </div>
              {[
                { label: t("footerFindWorker"), to: "/services" },
                { label: t("footerBookCar"), to: "/services?tab=cars" },
                { label: t("footerRegister"), to: "/register" },
              ].map((l, i) => (
                <Link
                  key={i}
                  to={l.to}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "rgba(255,255,255,.65)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  opacity: 0.4,
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: ".8px",
                }}
              >
                {t("footerSupport")}
              </div>
              {[
                { label: t("footerHelp"), to: "/support" },
                { label: t("footerTerms"), to: "/terms" },
                { label: t("footerPrivacy"), to: "/privacy" },
              ].map((l, i) => (
                <Link
                  key={i}
                  to={l.to}
                  style={{
                    display: "block",
                    fontSize: "13px",
                    color: "rgba(255,255,255,.65)",
                    textDecoration: "none",
                    marginBottom: "8px",
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div
            style={{
              padding: "14px",
              background: "rgba(255,255,255,.06)",
              borderRadius: "14px",
              marginBottom: "20px",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                opacity: 0.5,
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: ".5px",
              }}
            >
              {t("footerContact")}
            </div>
            <a
              href="mailto:sultanalih8@gmail.com"
              style={{
                display: "block",
                fontSize: "13px",
                color: "rgba(255,255,255,.75)",
                textDecoration: "none",
                marginBottom: "6px",
              }}
            >
              📧 sultanalih8@gmail.com
            </a>
            <a
              href="https://wa.me/918878353787"
              style={{
                display: "block",
                fontSize: "13px",
                color: "#25D366",
                textDecoration: "none",
                fontWeight: "700",
              }}
            >
              💬 WhatsApp: 8878353787
            </a>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.08)",
              paddingTop: "16px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "12px", opacity: 0.4 }}>
              {t("footerCopyright")}
            </p>
          </div>

          {/* SEO keyword block */}
          <div
            style={{
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid rgba(255,255,255,.05)",
              fontSize: "10px",
              color: "rgba(255,255,255,.2)",
              lineHeight: "1.9",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 4px" }}>
              <strong style={{ color: "rgba(255,255,255,.28)" }}>
                Nowrozabad Services:
              </strong>{" "}
              Electrician Nowrozabad · Plumber Nowrozabad · Beautician
              Nowrozabad · AC Technician Nowrozabad · Carpenter Nowrozabad ·
              Mason Nowrozabad · Mehndi Artist Nowrozabad · Car Booking
              Nowrozabad
            </p>
            <p style={{ margin: "0 0 4px" }}>
              <strong style={{ color: "rgba(255,255,255,.28)" }}>
                Birshingpur Pali Services:
              </strong>{" "}
              Electrician Birshingpur Pali · Plumber Birshingpur Pali ·
              Beautician Birshingpur Pali · AC Repair Birshingpur Pali · Car
              Rental Birshingpur Pali · Labour Service Birshingpur Pali
            </p>
            <p style={{ margin: 0 }}>
              बिजलीवाला नौरोजाबाद · प्लंबर नौरोजाबाद · ब्यूटीशियन नौरोजाबाद ·
              एसी टेक्नीशियन नौरोजाबाद · कारपेंटर नौरोजाबाद · कार बुकिंग
              नौरोजाबाद · मेसन नौरोजाबाद · मेहंदी आर्टिस्ट नौरोजाबाद
            </p>
          </div>
        </div>
      </div>

      {/* ══ SHARED BOTTOM NAV ═════════════════════════════════════════════ */}
      <BottomNav />
    </div>
  );
}
