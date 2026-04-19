import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";


const STATUS_COLORS = {
  pending: "#F97316",
  confirmed: "#3B82F6",
  in_progress: "#8B5CF6",
  completed: "#16A34A",
  cancelled: "#EF4444",
};

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Accepted",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function LabourDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const [isOnline, setIsOnline] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  // ── Video state ──
  const [myVideos, setMyVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [viewStats, setViewStats] = useState({
    todayViews: 0,
    monthlyViews: 0,
  });
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameForm, setEditNameForm] = useState({ name: "", city: "", serviceCities: [] });
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [serviceCities, setServiceCities] = useState([]);
  const [savingCities, setSavingCities] = useState(false);
  const [locations, setLocations] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/locations');
        setLocations(data);
      } catch (err) { console.error('Failed to fetch locations', err); }
    })();
  }, []);

  // Update available areas when service cities change
  useEffect(() => {
    const areas = [];
    serviceCities.forEach(cityName => {
      const loc = locations.find(l => l.city === cityName);
      if (loc && loc.areas) {
        loc.areas.forEach(a => {
          // areas can be plain strings or {name, isActive} objects
          const name = typeof a === 'string' ? a : a?.name;
          const active = typeof a === 'string' ? true : a?.isActive !== false;
          if (name && active && !areas.includes(name)) areas.push(name);
        });
      }
    });
    setAvailableAreas(areas);
  }, [serviceCities, locations]);

  const skillOptions = [
    "Electrician",
    "Plumber",
    "Carpenter",
    "Mason",
    "Beautician",
    "AC Technician",
    "Mehndi Artist",
    "Helper",
  ];

  // Open the correct tab when navigated from BottomNav with { state: { openTab } }
  useEffect(() => {
    const tab = location.state?.openTab;
    if (tab) {
      setActiveTab(tab);
      // Clear the state so a back-navigation or refresh doesn't re-apply it
      window.history.replaceState({}, '');
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchBookings();
    fetchViewStats();
  }, []);

  const fetchViewStats = async () => {
    try {
      const { data } = await api.get("/labours/my/stats");
      setViewStats(data);
    } catch {}
  };



  const saveEditName = async () => {
    if (!editNameForm.name.trim()) {
      toast.error(t("name") + " खाली नहीं हो सकता");
      return;
    }
    setEditNameLoading(true);
    try {
      const { data } = await api.put("/auth/profile", {
        name: editNameForm.name.trim(),
        city: editNameForm.city,
      });
      const stored = JSON.parse(localStorage.getItem("kroeasy_user") || "{}");
      localStorage.setItem(
        "kroeasy_user",
        JSON.stringify({ ...stored, name: data.name, city: data.city }),
      );
      refreshUser();
      // Also update Labour.city + Labour.serviceCities so worker appears in correct city search results
      if (profile?._id) {
        const labourUpdate = {};
        if (editNameForm.city) labourUpdate.city = editNameForm.city;
        if (editNameForm.serviceCities) labourUpdate.serviceCities = editNameForm.serviceCities;
        if (Object.keys(labourUpdate).length > 0) {
          await api.patch(`/labour/${profile._id}`, labourUpdate);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  city: labourUpdate.city ?? prev.city,
                  serviceCities: labourUpdate.serviceCities ?? prev.serviceCities,
                  userId: { ...prev.userId, city: labourUpdate.city ?? prev.userId?.city },
                }
              : prev,
          );
        }
      }
      setEditNameOpen(false);
      toast.success(t("profileUpdated") + " ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "अपडेट विफल");
    } finally {
      setEditNameLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPwError('');
    if (!pwForm.oldPassword) { setPwError('Please enter your current password'); return; }
    if (!pwForm.newPassword) { setPwError('Please enter a new password'); return; }
    if (!pwForm.confirm) { setPwError('Please confirm your new password'); return; }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.oldPassword === pwForm.newPassword) { setPwError('New password must be different from current password'); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword });
      toast.success('✅ Password changed successfully!');
      setPwOpen(false);
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password. Please try again.';
      setPwError(msg);
    } finally { setPwLoading(false); }
  };

  // Auto-refresh profile every 30 s while pending so worker sees approval without re-login
  useEffect(() => {
    if (!profile || profile.isApproved) return;
    const poll = async () => {
      try {
        // Update Labour profile
        const { data: labourData } = await api.get("/labours/my");
        setProfile(labourData);
        // Also sync AuthContext user from /auth/me so the banner and role checks update
        const { data: meData } = await api.get("/auth/me");
        const stored = JSON.parse(localStorage.getItem("kroeasy_user") || "{}");
        localStorage.setItem(
          "kroeasy_user",
          JSON.stringify({ ...stored, approvalStatus: meData.approvalStatus }),
        );
        refreshUser();
      } catch {}
    };
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [profile?.isApproved]);

  useEffect(() => {
    if (activeTab !== "bookings") return;
    fetchBookings();
    const interval = setInterval(() => {
        fetchBookings();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/labours/my");
      setProfile(data);
      setIsOnline(data.isOnline);
      setServiceCities(data.serviceCities || []);
      setEditForm({
        skills: data.skills,
        experience: data.experience,
        charges: data.charges,
        description: data.description,
        city: data.userId?.city || "",
        serviceCities: data.serviceCities || [],
        serviceAreas: data.serviceAreas || [],
        workRadius: data.workRadius || 5,
      });
      setServiceCities(data.serviceCities || []);
    } catch {
      toast.error("प्रोफ़ाइल लोड नहीं हुई");
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await api.get("/booking/provider");
      setBookings(data);
    } catch {}
  };

  const toggleOnlineStatus = async () => {
    const nextStatus = !isOnline;
    setGpsLoading(true);
    try {
      const { data } = await api.patch('/labour/profile/online-status', { isOnline: nextStatus });
      setIsOnline(data.isOnline);
      toast.success(data.isOnline ? "You are now ONLINE 🟢" : "You are now OFFLINE 🔴");
    } catch (err) {
      toast.error("Failed to toggle status");
    } finally {
      setGpsLoading(false);
    }
  };



  const saveProfile = async () => {
    try {
      const { data } = await api.patch(`/labour/${profile._id}`, editForm);
      setProfile(data);
      setEditing(false);
      toast.success(t("profileUpdated") + " ✅");
    } catch {
      toast.error("प्रोफ़ाइल अपडेट नहीं हुई");
    }
  };

  const toggleSkill = (skill) => {
    setEditForm((prev) => {
      if (prev.skills?.includes(skill)) {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) };
      }
      if ((prev.skills?.length || 0) >= 3) {
        toast.error('Maximum 3 skills allowed. Deselect one first.');
        return prev;
      }
      return { ...prev, skills: [...(prev.skills || []), skill] };
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post(
        `/labour/${profile._id}/upload-image`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setProfile(data);
      refreshUser();
      toast.success("📸 प्रोफ़ाइल फ़ोटो अपडेट हुई!");
    } catch {
      toast.error("इमेज अपलोड विफल");
    } finally {
      setUploading(false);
    }
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/booking/${bookingId}/status`, { status });
      const labels = {
        confirmed: 'स्वीकृत',
        in_progress: 'शुरू (In Progress)',
        completed: 'पूर्ण',
        cancelled: 'रद्द',
      };
      toast.success(`बुकिंग ${labels[status] || status} ✅`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'स्टेटस अपडेट विफल');
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div className="spinner" />
      </div>
    );

  return (
    <div className="page-container" style={{ paddingBottom: "24px" }}>
      <div
        className="app-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: "18px", fontWeight: "800" }}>
            {t("labourDashTitle")}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>{user?.name}</div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          style={{
            background: "transparent",
            border: "1.5px solid #CBD5E1",
            color: "#374151",
            padding: "7px 14px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {t("logout")}
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "white",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        {[
          { key: "dashboard", label: t("tabDashboard") },
          { key: "profile", label: t("tabProfile") },
          { key: "bookings", label: t("tabBookings") },
          { key: "videos", label: "🎬 Videos" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "14px 8px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              color: activeTab === tab.key ? "#1E3A8A" : "#64748B",
              borderBottom:
                activeTab === tab.key
                  ? "3px solid #1E3A8A"
                  : "3px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Approval Banner — shown while not yet approved */}
      {profile && !profile.isApproved && (
        <div
          style={{
            margin: "16px",
            padding: "14px 16px",
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "20px" }}>⏳</span>
          <div style={{ flex: 1 }}>
            <div
              style={{ fontSize: "14px", fontWeight: "700", color: "#EA580C" }}
            >
              {t("pendingApprovalTitle")}
            </div>
            <div style={{ fontSize: "12px", color: "#9A3412" }}>
              {t("pendingApprovalText")}
            </div>
            <div
              style={{ fontSize: "11px", color: "#B45309", marginTop: "3px" }}
            >
              स्वचालित रूप से अपडेट होगा — लॉगआउट की जरूरत नहीं
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                const { data: labourData } = await api.get("/labours/my");
                setProfile(labourData);
                const { data: meData } = await api.get("/auth/me");
                const stored = JSON.parse(
                  localStorage.getItem("kroeasy_user") || "{}",
                );
                localStorage.setItem(
                  "kroeasy_user",
                  JSON.stringify({
                    ...stored,
                    approvalStatus: meData.approvalStatus,
                  }),
                );
                refreshUser();
              } catch {}
            }}
            style={{
              background: "#F97316",
              border: "none",
              color: "white",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "700",
              whiteSpace: "nowrap",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}



      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div style={{ padding: "16px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {[
              {
                label: t("totalBookings"),
                value: profile?.bookingCount || 0,
                icon: "📋",
                color: "#1E3A8A",
              },
              {
                label: t("totalLeads"),
                value: profile?.leadCount || 0,
                icon: "📞",
                color: "#F97316",
              },
              {
                label: t("rating"),
                value: `${profile?.rating || 0}/5`,
                icon: "⭐",
                color: "#F59E0B",
              },
              {
                label: t("reviews"),
                value: profile?.reviewCount || 0,
                icon: "💬",
                color: "#16A34A",
              },
              {
                label: t("todayViews"),
                value: viewStats.todayViews,
                icon: "👁️",
                color: "#8B5CF6",
              },
              {
                label: t("monthlyViews"),
                value: viewStats.monthlyViews,
                icon: "📊",
                color: "#0891B2",
              },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div style={{ fontSize: "28px", marginBottom: "6px" }}>
                  {stat.icon}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    color: stat.color,
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    fontWeight: "500",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Availability Toggle */}
          <div
            className="card"
            style={{
              padding: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700" }}>
                {t("availability")}
              </div>
              <div style={{ fontSize: "13px", color: isOnline ? "#16A34A" : "#64748B", fontWeight: isOnline ? "600" : "400" }}>
                {isOnline
                  ? t("availableNowText")
                  : t("notAvailable")}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={isOnline}
                onChange={toggleOnlineStatus}
                disabled={gpsLoading}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          {gpsLoading && <div style={{ fontSize: '11px', color: '#3B82F6', textAlign: 'right', marginTop: '4px' }}>Updating location...</div>}

          {/* Profile Summary */}
          <div className="card" style={{ padding: "20px", marginTop: "12px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              {t("profileSummary")}
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
                marginBottom: "10px",
              }}
            >
              {profile?.skills?.map((skill) => (
                <span key={skill} className="badge badge-blue">
                  {skill}
                </span>
              ))}
            </div>
            <div
              style={{ fontSize: "13px", color: "#64748B", lineHeight: "1.6" }}
            >
              <div>
                💰 {t("chargesLabel")}:{" "}
                <strong>{profile?.charges || t("notSet")}</strong>
              </div>
              <div>
                🏙️ {t("city")}:{" "}
                <strong>{profile?.userId?.city || user?.city}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div style={{ padding: "16px" }}>
          {/* Approval Status Card */}
          {(() => {
            const statusMap = {
              pending: {
                bg: "#FFF7ED",
                border: "#FED7AA",
                icon: "⏳",
                title: t("pendingApprovalTitle"),
                text: t("pendingApprovalText"),
                color: "#EA580C",
              },
              approved: {
                bg: "#F0FDF4",
                border: "#BBF7D0",
                icon: "✅",
                title: t("approvedTitle"),
                text: t("approvedText"),
                color: "#16A34A",
              },
              rejected: {
                bg: "#FEF2F2",
                border: "#FECACA",
                icon: "❌",
                title: t("rejectedTitle"),
                text: t("rejectedText"),
                color: "#DC2626",
              },
            };
            const s = statusMap[profile?.isApproved ? "approved" : "pending"];
            if (!s) return null;
            return (
              <div
                style={{
                  padding: "14px 16px",
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  marginBottom: "16px",
                }}
              >
                <span style={{ fontSize: "26px", flexShrink: 0 }}>
                  {s.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: s.color,
                    }}
                  >
                    {s.title}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: s.color,
                      opacity: 0.8,
                      lineHeight: "1.5",
                      marginTop: "2px",
                    }}
                  >
                    {s.text}
                  </div>
                </div>
              </div>
            );
          })()}

          {!editing ? (
            <>
              {/* 1. Profile Info Card */}
              <div className="card" style={{ padding: "20px", textAlign: "center", marginBottom: "16px" }}>
                <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
                  {profile?.profileImage ? (
                    <img src={profile.profileImage} alt="Profile"
                      style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #E2E8F0" }} />
                  ) : (
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #1E3A8A, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: "white", fontWeight: "700" }}>
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <button onClick={() => fileRef.current?.click()}
                    style={{ position: "absolute", bottom: "0", right: "-4px", background: "#1E3A8A", border: "none", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>
                    📷
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
                {uploading && <p style={{ fontSize: "12px", color: "#3B82F6" }}>⏳ {t("uploading")}</p>}
                <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{user?.name}</h2>
                <p style={{ color: "#64748B", fontSize: "14px" }}>📱 {user?.phone}</p>
                <p style={{ color: "#64748B", fontSize: "14px" }}>🏙️ {profile?.userId?.city || user?.city || "Not set"}</p>
                {profile?.serviceCities?.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "#6366F1", marginBottom: "4px" }}>📍 {lang === "hi" ? "सेवा क्षेत्र" : "Service Cities"}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
                      {profile.serviceCities.map((c) => (
                        <span key={c} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "#EEF2FF", color: "#4338CA", fontWeight: "600", border: "1px solid #C7D2FE" }}>{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginTop: "10px" }}>
                  {profile?.skills?.map((s) => (
                    <span key={s} className="badge badge-blue">{s}</span>
                  ))}
                </div>
                <div style={{ fontSize: "13px", color: "#64748B", marginTop: "10px", lineHeight: "1.8" }}>
                  <div>💼 {t("experience")}: <strong>{profile?.experience} {t("years")}</strong></div>
                  <div>💰 {t("chargesLabel")}: <strong>{profile?.charges || t("notSet")}</strong></div>
                  <div>⭐ {t("rating")}: <strong>{profile?.rating || 0}/5</strong> ({profile?.reviewCount || 0} {t("reviews")})</div>
                  {profile?.description && <div style={{ marginTop: "6px", color: "#94A3B8" }}>{profile.description}</div>}
                </div>
              </div>


              {/* 2. Language Selector — same EN/HI two-button style as customer */}
              <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>🌐 {t("language")}</div>
                    <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{lang === "en" ? "English" : "हिंदी"}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {["en", "hi"].map((l) => (
                      <button key={l} onClick={() => switchLang(l)}
                        style={{ padding: "7px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", border: "2px solid", cursor: "pointer", borderColor: lang === l ? "#1E3A8A" : "#E2E8F0", background: lang === l ? "#1E3A8A" : "white", color: lang === l ? "white" : "#64748B", transition: "all 0.15s" }}>
                        {l === "en" ? "🌐 EN" : "🇮🇳 HI"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Edit Personal Info */}
              <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                <button onClick={() => { setEditNameOpen(!editNameOpen); setEditNameForm({ name: user?.name || "", city: profile?.userId?.city || user?.city || "", serviceCities: profile?.serviceCities || [] }); }}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>✏️</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{t("editPersonalInfo")}</span>
                  </div>
                  <span style={{ fontSize: "18px", color: "#94A3B8", transform: editNameOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {editNameOpen && (
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{t("name")}</label>
                      <input className="input-field" value={editNameForm.name} onChange={(e) => setEditNameForm((f) => ({ ...f, name: e.target.value }))} placeholder="अपना नाम" style={{ padding: "10px 12px", fontSize: "14px" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{t("city")} ({lang === "hi" ? "मुख्य शहर" : "Primary City"})</label>
                      <select className="input-field" value={editNameForm.city} onChange={(e) => setEditNameForm((f) => ({ ...f, city: e.target.value }))} style={{ padding: "10px 12px", fontSize: "14px" }}>
                        <option value="">{t("selectCity")}</option>
                        {locations.map((c) => (<option key={c._id} value={c.city}>{lang === "hi" ? (c.nameHi || c.city) : c.city}</option>))}
                      </select>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setEditNameOpen(false)} className="btn-outline" style={{ flex: 1, padding: "10px", fontSize: "13px" }}>{t("cancel")}</button>
                      <button onClick={saveEditName} className="btn-primary" disabled={editNameLoading} style={{ flex: 1, padding: "10px", fontSize: "13px", opacity: editNameLoading ? 0.7 : 1 }}>
                        {editNameLoading ? t("updating") : t("saveBtn")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 3b. Service Cities — simplified single-step card */}
              {(() => {
                const toggleCity = (cityEn) => {
                  setServiceCities(prev =>
                    prev.includes(cityEn)
                      ? prev.filter(c => c !== cityEn)
                      : [...prev, cityEn]
                  );
                };
                const saveCities = async () => {
                  if (!profile?._id) return;
                  setSavingCities(true);
                  try {
                    await api.patch(`/labour/${profile._id}`, {
                      serviceCities,
                      serviceAreas: editForm.serviceAreas || []
                    });
                    setProfile(prev => prev ? { ...prev, serviceCities } : prev);
                    toast.success(lang === "hi" ? "✅ शहर सेव हो गए!" : "✅ Cities saved!");
                  } catch {
                    toast.error(lang === "hi" ? "अपडेट विफल" : "Update failed");
                  } finally {
                    setSavingCities(false);
                  }
                };
                return (
                  <div className="card" style={{ padding: "16px", marginBottom: "12px", background: "linear-gradient(135deg,#EFF6FF,#E0E7FF)", border: "1.5px solid #BFDBFE" }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <span style={{ fontSize: "26px" }}>📍</span>
                      <div>
                        <div style={{ fontSize: "15px", fontWeight: "800", color: "#1E3A8A" }}>
                          {lang === "hi" ? "अपने सेवा शहर चुनें" : "Select Your Service Cities"}
                        </div>
                        <div style={{ fontSize: "12px", color: "#3730A3", marginTop: "2px" }}>
                          {lang === "hi" ? "जिन शहरों में काम करते हैं उन्हें टैप करें, फिर Save करें" : "Tap the cities you work in, then tap Save"}
                        </div>
                      </div>
                    </div>

                    {/* Step indicator */}
                    <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", borderRadius: "20px", padding: "5px 12px", border: "1.5px solid #BFDBFE" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#1E3A8A", color: "white", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#1E3A8A" }}>{lang === "hi" ? "शहर चुनें" : "Pick cities"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", borderRadius: "20px", padding: "5px 12px", border: "1.5px solid #BFDBFE" }}>
                        <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#1E3A8A", color: "white", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#1E3A8A" }}>{lang === "hi" ? "Save दबाएं" : "Press Save"}</span>
                      </div>
                    </div>

                    {/* City buttons */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                      {locations.map((c) => {
                        const selected = serviceCities.includes(c.city);
                        const label = lang === "hi" ? (c.nameHi || c.city) : c.city;
                        return (
                          <button key={c._id} type="button"
                            onClick={() => toggleCity(c.city)}
                            style={{
                              padding: "10px 18px", borderRadius: "25px", fontSize: "14px", fontWeight: "700",
                              border: `2.5px solid ${selected ? "#1E3A8A" : "#BFDBFE"}`,
                              background: selected ? "#1E3A8A" : "white",
                              color: selected ? "white" : "#3730A3",
                              cursor: "pointer", transition: "all 0.15s",
                              boxShadow: selected ? "0 3px 10px rgba(30,58,138,0.3)" : "none"
                            }}>
                            {selected ? "✅ " : ""}{label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected count */}
                    {serviceCities.length > 0 ? (
                      <div style={{ fontSize: "12px", color: "#1E40AF", fontWeight: "600", marginTop: "10px", marginBottom: "12px", background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 12px" }}>
                        ✅ {lang === "hi" ? `${serviceCities.length} शहर चुने: ` : `${serviceCities.length} selected: `}
                        <strong>{serviceCities.join(", ")}</strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: "12px", color: "#6366F1", fontWeight: "600", marginTop: "10px", marginBottom: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                        👆 {lang === "hi" ? "ऊपर से कोई शहर टैप करें" : "Tap a city above to select it"}
                      </div>
                    )}

                    {/* Single Save button */}
                    <button
                      onClick={saveCities}
                      disabled={savingCities || serviceCities.length === 0}
                      style={{
                        width: "100%", padding: "13px", background: serviceCities.length === 0 ? "#CBD5E1" : (savingCities ? "#93C5FD" : "#1E3A8A"),
                        color: "white", border: "none", borderRadius: "12px",
                        fontSize: "15px", fontWeight: "800", cursor: serviceCities.length === 0 ? "not-allowed" : "pointer",
                        transition: "all 0.2s"
                      }}>
                      {savingCities
                        ? (lang === "hi" ? "⏳ सेव हो रहा है..." : "⏳ Saving...")
                        : (lang === "hi" ? "💾 शहर सेव करें" : "💾 Save Cities")}
                    </button>
                  </div>
                );
              })()}

              {/* 4. Edit Work Profile */}
              <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                <button onClick={() => setEditing(true)}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>🔧</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{t("editProfileBtn")}</span>
                  </div>
                  <span style={{ fontSize: "18px", color: "#94A3B8" }}>›</span>
                </button>
              </div>

              {/* 5. Change Password */}
              <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
                <button onClick={() => { setPwOpen(!pwOpen); setPwForm({ oldPassword: "", newPassword: "", confirm: "" }); setPwError(""); }}
                  style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "20px" }}>🔒</span>
                    <span style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{t("changePassword")}</span>
                  </div>
                  <span style={{ fontSize: "18px", color: "#94A3B8", transform: pwOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
                </button>
                {pwOpen && (
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {[
                      { key: "oldPassword", label: t("currentPassword"), ph: "Enter current password" },
                      { key: "newPassword", label: t("newPassword"), ph: "Min 6 characters" },
                      { key: "confirm", label: t("confirmNewPassword"), ph: "Re-enter new password" },
                    ].map(({ key, label, ph }) => (
                      <div key={key}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{label}</label>
                        <input className="input-field" type="password" placeholder={ph}
                          value={pwForm[key]} onChange={(e) => { setPwForm({ ...pwForm, [key]: e.target.value }); setPwError(""); }}
                          style={{ padding: "10px 12px", fontSize: "14px" }} />
                      </div>
                    ))}
                    {pwError && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#DC2626" }}>❌ {pwError}</div>
                    )}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setPwOpen(false)} className="btn-outline" style={{ flex: 1, padding: "10px", fontSize: "13px" }}>{t("cancel")}</button>
                      <button onClick={handlePasswordChange} className="btn-primary" disabled={pwLoading} style={{ flex: 1, padding: "10px", fontSize: "13px", opacity: pwLoading ? 0.7 : 1 }}>
                        {pwLoading ? t("updating") : t("changePassword")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Logout — bottom */}
              <button onClick={() => { logout(); navigate('/'); }} className="btn-danger"
                style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', marginTop: '8px' }}>
                🚪 {t('logout')}
              </button>
            </>

          ) : (
            <div className="card" style={{ padding: "20px" }}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "16px",
                }}
              >
                {t("editProfileTitle")}
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600' }}>
                      {t('skillsField')}
                    </label>
                    <span style={{
                      fontSize: '11px', fontWeight: '700',
                      color: (editForm.skills?.length || 0) >= 3 ? '#DC2626' : '#6366F1',
                      background: (editForm.skills?.length || 0) >= 3 ? '#FEF2F2' : '#EEF2FF',
                      padding: '2px 8px', borderRadius: '999px',
                    }}>
                      {editForm.skills?.length || 0}/3
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skillOptions.map((skill) => {
                      const isSelected = editForm.skills?.includes(skill);
                      const isDisabled = !isSelected && (editForm.skills?.length || 0) >= 3;
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          disabled={isDisabled}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: `1.5px solid ${isSelected ? '#1E3A8A' : '#E2E8F0'}`,
                            background: isSelected ? '#1E3A8A' : isDisabled ? '#F8FAFC' : 'white',
                            color: isSelected ? 'white' : isDisabled ? '#CBD5E1' : '#374151',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled ? 0.5 : 1,
                          }}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      {t("experienceYrs")}
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      value={editForm.experience}
                      onChange={(e) =>
                        setEditForm({ ...editForm, experience: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      {t("chargesField")}
                    </label>
                    <input
                      className="input-field"
                      value={editForm.charges}
                      onChange={(e) =>
                        setEditForm({ ...editForm, charges: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    {t("descField")}
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    style={{ resize: "none" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn-primary"
                    onClick={saveProfile}
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {t("saveBtn")}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => setEditing(false)}
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div style={{ padding: "16px" }}>
          {bookings.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 20px",
                color: "#64748B",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📋</div>
              <p style={{ fontWeight: "600" }}>{t("noBookingsText")}</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {bookings.map((b) => (
                <div key={b._id} className="card" style={{ padding: "16px" }}>
                  {/* Customer Info Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "15px" }}>
                        {b.userId?.name || "ग्राहक"}
                      </div>
                      {/* <div style={{ fontSize: "13px", color: "#64748B" }}>
                        📱 {b.userId?.phone}
                      </div> */}
                      {(b.userId?.city || b.address) && (
                        <div style={{ fontSize: "12px", color: "#4F46E5", fontWeight: "600", marginTop: "2px" }}>
                          📍 {[b.address, b.userId?.city].filter(Boolean).join(", ")}
                        </div>
                      )}
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        {new Date(b.createdAt).toLocaleDateString("hi-IN")}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: (STATUS_COLORS[b.status] || "#64748B") + "20",
                        color: STATUS_COLORS[b.status] || "#64748B",
                      }}
                    >
                      {STATUS_LABELS[b.status] || b.status}
                    </span>
                  </div>

                {/* Call Button — always shown when phone is available */}
                  {b.userId?.phone && b.status !== "completed" && b.status !== "cancelled" && (
                    <a
                      href={`tel:${b.userId.phone}`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                        width: "100%", padding: "9px", marginBottom: "8px",
                        borderRadius: "10px", background: "linear-gradient(135deg, #16A34A, #15803D)",
                        color: "white", fontSize: "13px", fontWeight: "700",
                        textDecoration: "none", boxSizing: "border-box",
                      }}
                    >
                      📞 {lang === "hi" ? "कस्टमर को कॉल करें" : "Call Customer"}
                    </a>
                  )}

                  {/* Action Buttons */}
                  {b.status === "pending" && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <button
                        onClick={() => updateBookingStatus(b._id, "confirmed")}
                        className="btn-primary"
                        style={{ flex: 1, padding: "8px", fontSize: "12px" }}
                      >
                        {t("confirmBtn")}
                      </button>
                      <button
                        onClick={() => updateBookingStatus(b._id, "cancelled")}
                        className="btn-danger"
                        style={{ flex: 1, padding: "8px", fontSize: "12px" }}
                      >
                        {t("cancelBtnLabel")}
                      </button>
                    </div>
                  )}
                  {(b.status === "confirmed" || b.status === "in_progress") && (
                    <button
                      onClick={() => updateBookingStatus(b._id, 'completed')}
                      className="btn-success"
                      style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '4px', fontWeight: '700' }}
                    >
                      ✅ {t('markCompletedBtn')}
                    </button>
                  )}

                  {b.review?.rating && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px",
                        background: "#F0FDF4",
                        borderRadius: "8px",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#16A34A",
                          marginBottom: "4px",
                        }}
                      >
                        {"⭐".repeat(b.review.rating)}{" "}
                        {t("customerReviewLabel")}
                      </div>
                      {b.review.comment && (
                        <p style={{ fontSize: "12px", color: "#64748B" }}>
                          {b.review.comment}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Videos Tab ── */}
      {activeTab === "videos" && (
        <LabourVideoTab
          profileId={profile?._id}
          myVideos={myVideos}
          setMyVideos={setMyVideos}
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
          videoTitle={videoTitle}
          setVideoTitle={setVideoTitle}
          videoUploading={videoUploading}
          setVideoUploading={setVideoUploading}
          videoError={videoError}
          setVideoError={setVideoError}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   LabourVideoTab — isolated component so
   the heavy video logic stays separate
───────────────────────────────────────── */
function LabourVideoTab({
  profileId, myVideos, setMyVideos,
  videoUrl, setVideoUrl,
  videoTitle, setVideoTitle,
  videoUploading, setVideoUploading,
  videoError, setVideoError,
}) {
  // Fetch own videos on mount
  useEffect(() => {
    if (!profileId) return;
    api.get('/videos?limit=50').then(({ data }) => {
      // filter to only this uploader's videos
      setMyVideos((data.data || []).filter(v => v.uploaderId === profileId.toString()));
    }).catch(() => {});
  }, [profileId]);

  const handleUpload = async () => {
    setVideoError('');
    const trimmed = videoUrl.trim();
    if (!trimmed) { setVideoError('Please paste a YouTube Shorts link.'); return; }
    setVideoUploading(true);
    try {
      const { data } = await api.post('/videos', { youtubeUrl: trimmed, title: videoTitle.trim() });
      setMyVideos(prev => [data, ...prev]);
      setVideoUrl('');
      setVideoTitle('');
      toast.success('🎬 Video uploaded successfully!');
    } catch (err) {
      setVideoError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setVideoUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await api.delete(`/videos/my/${id}`);
      setMyVideos(prev => prev.filter(v => v._id !== id));
      toast.success('Video deleted.');
    } catch {
      toast.error('Delete failed.');
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Upload card */}
      <div className="card" style={{ padding: '20px', marginBottom: '16px', background: 'linear-gradient(135deg,#EFF6FF,#E0E7FF)', border: '1.5px solid #BFDBFE' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E3A8A', marginBottom: '4px' }}>🎬 Upload YouTube Shorts</h3>
        <p style={{ fontSize: '12px', color: '#3730A3', marginBottom: '16px', lineHeight: '1.5' }}>
          Share your work! Paste a YouTube Shorts link below. Only Shorts links are accepted
          (e.g. <code style={{ background: '#DBEAFE', padding: '1px 4px', borderRadius: '4px' }}>https://youtube.com/shorts/VIDEO_ID</code>)
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            className="input-field"
            placeholder="https://youtube.com/shorts/..."
            value={videoUrl}
            onChange={e => { setVideoUrl(e.target.value); setVideoError(''); }}
            style={{ padding: '11px 12px', fontSize: '13px' }}
          />
          <input
            className="input-field"
            placeholder="Caption / title (optional)"
            value={videoTitle}
            onChange={e => setVideoTitle(e.target.value)}
            style={{ padding: '11px 12px', fontSize: '13px' }}
          />

          {videoError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>
              ⚠️ {videoError}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={videoUploading}
            className="btn-primary"
            style={{ padding: '12px', fontSize: '14px', opacity: videoUploading ? 0.7 : 1 }}
          >
            {videoUploading ? '⏳ Uploading…' : '📤 Upload Video'}
          </button>
        </div>
      </div>

      {/* My Videos list */}
      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>My Uploaded Videos ({myVideos.length})</h3>
      {myVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
          <div style={{ fontSize: '40px' }}>🎬</div>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>No videos yet. Upload your first YouTube Short!</p>
        </div>
      ) : (
        myVideos.map(v => (
          <div key={v._id} className="card" style={{ padding: '14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {/* Thumbnail */}
            <img
              src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
              alt="thumbnail"
              style={{ width: '100px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.title || 'Untitled'}
              </p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>
                {new Date(v.createdAt).toLocaleDateString('en-IN')}
              </p>
              <a
                href={v.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#4F46E5', textDecoration: 'none', fontWeight: '600' }}
              >
                ▶ View on YouTube
              </a>
            </div>
            <button
              onClick={() => handleDelete(v._id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#EF4444', padding: '4px', flexShrink: 0 }}
              title="Delete"
            >
              🗑️
            </button>
          </div>
        ))
      )}
    </div>
  );
}
