import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";
import CITIES from "../utils/cities";

const STATUS_COLORS = {
  pending: "#F97316",
  confirmed: "#3B82F6",
  completed: "#16A34A",
  cancelled: "#EF4444",
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
  const [viewStats, setViewStats] = useState({
    todayViews: 0,
    monthlyViews: 0,
  });
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameForm, setEditNameForm] = useState({ name: "", city: "" });
  const [editNameLoading, setEditNameLoading] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

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
      // Also update Labour.city so worker appears in correct city search results
      if (profile?._id && editNameForm.city) {
        await api.patch(`/labour/${profile._id}`, { city: editNameForm.city });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                city: editNameForm.city,
                userId: { ...prev.userId, city: editNameForm.city },
              }
            : prev,
        );
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
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/labours/my");
      setProfile(data);
      setEditForm({
        skills: data.skills,
        experience: data.experience,
        charges: data.charges,
        description: data.description,
        city: data.userId?.city || "",
      });
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

  const toggleAvailability = async () => {
    try {
      const { data } = await api.patch(`/labour/${profile._id}`, {
        availability: !profile.availability,
      });
      setProfile(data);
      toast.success(
        data.availability ? t("availableNowText") : t("notAvailable"),
      );
    } catch {
      toast.error("अपडेट नहीं हुआ");
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
    setEditForm((prev) => ({
      ...prev,
      skills: prev.skills?.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...(prev.skills || []), skill],
    }));
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
      toast.success(
        `बुकिंग ${status === "confirmed" ? "स्वीकृत" : status === "completed" ? "पूर्ण" : "रद्द"} ✅`,
      );
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "स्टेटस अपडेट विफल");
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
              <div style={{ fontSize: "13px", color: "#64748B" }}>
                {profile?.availability
                  ? t("availableNowText")
                  : t("notAvailable")}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={profile?.availability || false}
                onChange={toggleAvailability}
              />
              <span className="toggle-slider" />
            </label>
          </div>

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
                <button onClick={() => { setEditNameOpen(!editNameOpen); setEditNameForm({ name: user?.name || "", city: profile?.userId?.city || user?.city || "" }); }}
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
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{t("city")}</label>
                      <select className="input-field" value={editNameForm.city} onChange={(e) => setEditNameForm((f) => ({ ...f, city: e.target.value }))} style={{ padding: "10px 12px", fontSize: "14px" }}>
                        <option value="">{t("selectCity")}</option>
                        {CITIES.map((c) => (<option key={c.en} value={c.en}>{lang === "hi" ? c.hi : c.en}</option>))}
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
              <button onClick={() => { logout(); navigate("/"); }} className="btn-danger"
                style={{ width: "100%", padding: "14px", fontSize: "15px", justifyContent: "center", marginTop: "8px" }}>
                🚪 {t("logout")}
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
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    {t("skillsField")}
                  </label>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}
                  >
                    {skillOptions.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: "16px",
                          fontSize: "12px",
                          fontWeight: "500",
                          border: `1.5px solid ${editForm.skills?.includes(skill) ? "#1E3A8A" : "#E2E8F0"}`,
                          background: editForm.skills?.includes(skill)
                            ? "#1E3A8A"
                            : "white",
                          color: editForm.skills?.includes(skill)
                            ? "white"
                            : "#374151",
                          cursor: "pointer",
                        }}
                      >
                        {skill}
                      </button>
                    ))}
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "700", fontSize: "15px" }}>
                        {b.userId?.name || "ग्राहक"}
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748B" }}>
                        📱 {b.userId?.phone}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#94a3b8",
                          marginTop: "4px",
                        }}
                      >
                        {new Date(b.createdAt).toLocaleDateString("hi-IN")}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background:
                          (STATUS_COLORS[b.status] || "#64748B") + "20",
                        color: STATUS_COLORS[b.status] || "#64748B",
                      }}
                    >
                      {b.status === "pending"
                        ? t("statusPending")
                        : b.status === "confirmed"
                          ? t("statusConfirmed")
                          : b.status === "completed"
                            ? t("statusCompleted")
                            : t("statusCancelled")}
                    </span>
                  </div>

                  {b.status === "pending" && (
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                    >
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
                  {b.status === "confirmed" && (
                    <button
                      onClick={() => updateBookingStatus(b._id, "completed")}
                      className="btn-success"
                      style={{
                        width: "100%",
                        padding: "8px",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      {t("markCompletedBtn")}
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
    </div>
  );
}
