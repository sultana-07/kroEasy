import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api";
import { cache } from "../utils/apiCache";
import toast from "react-hot-toast";

const emptyCarForm = {
  carName: "",
  numberPlate: "",
  modelYear: new Date().getFullYear(),
  basePrice: "",
  seats: "",
};
const STATUS_COLORS = {
  pending: "#F97316",
  confirmed: "#3B82F6",
  completed: "#16A34A",
  cancelled: "#EF4444",
};

export default function CarOwnerDashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { t, lang, switchLang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [carForm, setCarForm] = useState(emptyCarForm);
  const [activeTab, setActiveTab] = useState("cars");
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileImgOpen, setProfileImgOpen] = useState(false);
  const fileRef = useRef();
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
  const [loadingScreen, setLoadingScreen] = useState(true);
  // ── Video state ──
  const [myVideos, setMyVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [availableLocations, setAvailableLocations] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/locations');
        setAvailableLocations(data);
      } catch (err) { console.error('Failed to load locations', err); }
    })();
  }, []);

  // Open the correct tab when navigated from BottomNav with { state: { openTab } }
  useEffect(() => {
    const tab = location.state?.openTab;
    if (tab) {
      setActiveTab(tab);
      // Clear the state so back-navigation or refresh doesn't re-apply it
      window.history.replaceState({}, '');
    }
  }, []);

  useEffect(() => {
    fetchCars();
    fetchBookings();
    fetchOwnerProfile().finally(() => setLoadingScreen(false));
    fetchViewStats();
  }, []);

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

  const fetchViewStats = async () => {
    try {
      const { data } = await api.get("/cars/owner-stats");
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
      if (editNameForm.city) {
        await api.patch("/cars/owner-profile", {
          city: editNameForm.city,
          serviceCities: editNameForm.serviceCities || [],
        });
        setOwnerProfile((prev) => prev ? { ...prev, city: editNameForm.city, serviceCities: editNameForm.serviceCities || [] } : prev);
      } else if (editNameForm.serviceCities?.length) {
        await api.patch("/cars/owner-profile", { serviceCities: editNameForm.serviceCities });
        setOwnerProfile((prev) => prev ? { ...prev, serviceCities: editNameForm.serviceCities } : prev);
      }
      setEditNameOpen(false);
      toast.success(t("profileUpdated") + " ✅");
    } catch (err) {
      toast.error(err.response?.data?.message || "अपडेट विफल");
    } finally {
      setEditNameLoading(false);
    }
  };

  // Fetch the CarOwner document — this is the source of truth for isApproved.
  // (Admin approval sets CarOwner.isApproved, never User.approvalStatus.)
  const fetchOwnerProfile = async () => {
    try {
      const { data } = await api.get("/cars/owner-profile");
      setOwnerProfile(data);
      setServiceCities(data.serviceCities || []);
    } catch {}
  };

  // Poll the CarOwner profile every 30s while not approved
  // so status updates automatically without re-login (same as LabourDashboard).
  useEffect(() => {
    if (!ownerProfile || ownerProfile.isApproved) return;
    const interval = setInterval(fetchOwnerProfile, 30000);
    return () => clearInterval(interval);
  }, [ownerProfile?.isApproved]);

  // Auto-refresh bookings every 15 seconds when on bookings tab
  useEffect(() => {
    if (activeTab !== "bookings") return;
    fetchBookings();
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.post("/auth/upload-avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const stored = JSON.parse(localStorage.getItem("kroeasy_user") || "{}");
      localStorage.setItem(
        "kroeasy_user",
        JSON.stringify({ ...stored, avatar: data.avatar }),
      );
      refreshUser();
      toast.success("📸 प्रोफ़ाइल फ़ोटो अपडेट हुई!");
    } catch {
      toast.error("इमेज अपलोड विफल");
    } finally {
      setAvatarUploading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await api.get("/booking/provider");
      setBookings(data);
    } catch {}
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/booking/${bookingId}/status`, { status });
      toast.success(`Booking marked as ${status} ✅`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const fetchCars = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/cars/my");
      setCars(data);
    } catch (err) {
      if (err.response?.status !== 403) toast.error("कारें लोड नहीं हुईं");
    } finally {
      setLoading(false);
    }
  };

  const saveCar = async () => {
    if (!carForm.carName || !carForm.basePrice)
      return toast.error("कार का नाम और कीमत जरूरी है");
    try {
      if (editingCar) {
        const { data } = await api.patch(`/car/${editingCar._id}`, carForm);
        setCars(cars.map((c) => (c._id === editingCar._id ? data : c)));
        toast.success("कार अपडेट हुई! ✅");
      } else {
        const { data } = await api.post("/car", carForm);
        setCars([...cars, data]);
        cache.bust("/cars"); // bust public listing cache so new car shows immediately
        toast.success("कार जोड़ी गई! 🚗");
      }
      setShowAddForm(false);
      setEditingCar(null);
      setCarForm(emptyCarForm);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save car");
    }
  };

  const deleteCar = async (carId) => {
    if (!window.confirm("इस कार को हटाएं?")) return;
    try {
      await api.delete(`/car/${carId}`);
      setCars(cars.filter((c) => c._id !== carId));
      toast.success("कार हटा दी गई");
    } catch {
      toast.error("हटाने में विफल");
    }
  };

  const toggleCarAvailability = async (car) => {
    try {
      const { data } = await api.patch(`/car/${car._id}`, {
        availability: !car.availability,
      });
      setCars(cars.map((c) => (c._id === car._id ? data : c)));
      toast.success(
        data.availability ? "✅ कार अभी उपलब्ध है" : "⏸️ कार अनुपलब्ध",
      );
    } catch {
      toast.error("अपडेट नहीं हुआ");
    }
  };

  const startEdit = (car) => {
    setEditingCar(car);
    setCarForm({
      carName: car.carName,
      numberPlate: car.numberPlate || "",
      modelYear: car.modelYear,
      basePrice: car.basePrice,
      seats: car.seats || "",
    });
    setShowAddForm(true);
  };

  if (loadingScreen)
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(165deg, #1C0A00 0%, #4A1500 40%, #C2410C 100%)'
      }}>
        {/* KroEasy Car Owner Icon */}
        <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ animation: 'splash-bounce 1.2s ease-in-out', filter: 'drop-shadow(0 8px 24px rgba(249,115,22,0.5))' }}>
          <defs>
            <linearGradient id="co-bg" x1="0" y1="0" x2="88" y2="88" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#F97316"/>
              <stop offset="100%" stopColor="#C2410C"/>
            </linearGradient>
          </defs>
          <rect width="88" height="88" rx="22" fill="url(#co-bg)"/>
          {/* Car body */}
          <rect x="14" y="42" width="60" height="22" rx="5" fill="white" fillOpacity="0.95"/>
          {/* Car roof */}
          <path d="M24 42 L32 26 L56 26 L64 42 Z" fill="white" fillOpacity="0.85"/>
          {/* Windows */}
          <rect x="33" y="29" width="9" height="11" rx="2" fill="#F97316" fillOpacity="0.7"/>
          <rect x="45" y="29" width="9" height="11" rx="2" fill="#F97316" fillOpacity="0.7"/>
          {/* Wheels */}
          <circle cx="27" cy="64" r="8" fill="#1C1917"/>
          <circle cx="27" cy="64" r="4" fill="#F97316"/>
          <circle cx="61" cy="64" r="8" fill="#1C1917"/>
          <circle cx="61" cy="64" r="4" fill="#F97316"/>
          {/* KroEasy K badge */}
          <circle cx="63" cy="25" r="12" fill="#10B981"/>
          <path d="M57 25L63 19L63 25L69 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M63 25L69 31" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginTop: '16px', letterSpacing: '-0.5px',
          opacity: 0, animation: 'splash-fade-up 0.7s ease forwards 0.7s' }}>KroEasy</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginTop: '4px',
          opacity: 0, animation: 'splash-fade-up 0.7s ease forwards 1s' }}>Car Owner Dashboard</div>
        <div style={{ marginTop: '28px', width: '36px', height: '36px',
          border: '3px solid rgba(255,255,255,0.15)', borderTopColor: '#FED7AA',
          borderRadius: '50%',
          opacity: 0, animation: 'splash-spin 0.8s linear infinite, splash-fade-up 0.4s ease forwards 1.4s' }} />
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
            {t("carOwnerDashboard")}
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
          marginTop: "12px",
        }}
      >
        {[
          { key: "cars", label: t("myCars") },
          { key: "bookings", label: t("tabBookings") },
          { key: "profile", label: t("tabProfile") },
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

      {/* Cars Tab */}
      {activeTab === "cars" && (
        <div style={{ padding: "16px" }}>
          {/* Approval Status inline banner */}
          {ownerProfile &&
            !ownerProfile.isApproved &&
            (() => {
              const m = {
                pending: {
                  bg: "#FFF7ED",
                  border: "#FED7AA",
                  icon: "⏳",
                  title: t("pendingApprovalTitle"),
                  msg: "समीक्षाधीन — अनुमोदन के बाद कार जोड़ सकते हैं।",
                  color: "#EA580C",
                },
              }[ownerProfile.isApproved === false ? "pending" : ""];
              if (!m) return null;
              return (
                <div
                  style={{
                    padding: "12px 14px",
                    background: m.bg,
                    border: `1px solid ${m.border}`,
                    borderRadius: "12px",
                    display: "flex",
                    gap: "10px",
                    marginBottom: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: m.color,
                      }}
                    >
                      {m.title}
                    </div>
                    <div
                      style={{ fontSize: "12px", color: m.color, opacity: 0.8 }}
                    >
                      {m.msg}
                    </div>
                  </div>
                  <button
                    onClick={fetchOwnerProfile}
                    style={{
                      background: "#F97316",
                      border: "none",
                      color: "white",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              );
            })()}
          {/* Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {[
              { label: t("totalCars"), value: cars.length, icon: "🚗" },
              {
                label: t("totalLeads"),
                value: cars.reduce((a, c) => a + (c.leadCount || 0), 0),
                icon: "📞",
              },
              {
                label: t("myBookings"),
                value: cars.reduce((a, c) => a + (c.bookingCount || 0), 0),
                icon: "📋",
              },
              {
                label: t("todayViews"),
                value: viewStats.todayViews,
                icon: "👁️",
              },
              {
                label: t("monthlyViews"),
                value: viewStats.monthlyViews,
                icon: "📊",
              },
            ].map((s, i) => (
              <div
                key={i}
                className="stat-card"
                style={{ padding: "14px 10px" }}
              >
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>
                  {s.icon}
                </div>
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: "800",
                    color: "#1E3A8A",
                  }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Add Car Button — only shown to approved owners */}
          {!showAddForm && ownerProfile?.isApproved && (
            <button
              className="btn-primary"
              onClick={() => {
                setShowAddForm(true);
                setEditingCar(null);
                setCarForm(emptyCarForm);
              }}
              style={{ width: "100%", padding: "13px", marginBottom: "16px" }}
            >
              {t("addNewCar")}
            </button>
          )}
          {!showAddForm && !ownerProfile?.isApproved && (
            <div
              style={{
                padding: "14px 16px",
                background: "#FFF7ED",
                border: "1px dashed #FED7AA",
                borderRadius: "12px",
                textAlign: "center",
                marginBottom: "16px",
                color: "#9A3412",
                fontSize: "13px",
              }}
            >
              ⏳ {t("pendingApprovalText")}
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div
              className="card"
              style={{ padding: "20px", marginBottom: "16px" }}
            >
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "16px",
                }}
              >
                {editingCar ? t("editCar") : t("addNewCar")}
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
                    {t("carName")} *
                  </label>
                  <input
                    className="input-field"
                    placeholder="e.g. Maruti Swift"
                    value={carForm.carName}
                    onChange={(e) =>
                      setCarForm({ ...carForm, carName: e.target.value })
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
                    {t("numberPlate")}
                  </label>
                  <input
                    className="input-field"
                    placeholder="e.g. MH12AB1234"
                    value={carForm.numberPlate}
                    maxLength={10}
                    onChange={(e) =>
                      setCarForm({
                        ...carForm,
                        numberPlate: e.target.value.toUpperCase().slice(0, 10),
                      })
                    }
                    style={{ textTransform: "uppercase", letterSpacing: "1px" }}
                  />
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
                      {t("modelYear")}
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      value={carForm.modelYear}
                      onChange={(e) =>
                        setCarForm({ ...carForm, modelYear: e.target.value })
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
                      💰 {t("perKm")} (₹) *
                    </label>
                    <input
                      className="input-field"
                      type="number"
                      placeholder="e.g. 12"
                      value={carForm.basePrice}
                      onChange={(e) =>
                        setCarForm({ ...carForm, basePrice: e.target.value })
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
                    🪑 {t("seatingLabel")}
                  </label>
                  <select
                    className="input-field"
                    value={carForm.seats || ""}
                    onChange={(e) =>
                      setCarForm({
                        ...carForm,
                        seats: e.target.value ? Number(e.target.value) : "",
                      })
                    }
                  >
                    <option value="">{t("selectSeats")}</option>
                    {[4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {t("seater")}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    className="btn-primary"
                    onClick={saveCar}
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {t("saveCar")}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingCar(null);
                    }}
                    style={{ flex: 1, padding: "12px" }}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Car List */}
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "40px",
              }}
            >
              <div className="spinner" />
            </div>
          ) : cars.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "#64748B",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚗</div>
              <p style={{ fontWeight: "600" }}>अभी कोई कार नहीं जोड़ी</p>
              <p style={{ fontSize: "13px" }}>
                बुकिंग शुरू करने के लिए अपनी पहली कार जोड़ें
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {cars.map((car) => (
                <div key={car._id} className="card" style={{ padding: "16px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700" }}>
                        🚗 {car.carName}
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748B" }}>
                        {car.modelYear} • {t("perKm")}
                      </div>
                      {car.numberPlate && (
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: "#1E3A8A",
                            background: "#EFF6FF",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            display: "inline-block",
                            letterSpacing: "1px",
                            marginTop: "3px",
                            border: "1px solid #BFDBFE",
                          }}
                        >
                          🚘 {car.numberPlate}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "800",
                          color: "#1E3A8A",
                        }}
                      >
                        ₹{car.basePrice}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748B" }}>
                        /{t("perKm")}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      marginBottom: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    {car.seats ? (
                      <span className="badge badge-blue">
                        🪑 {car.seats} {t("seater")}
                      </span>
                    ) : null}
                    {car.ac && <span className="badge badge-blue">❄️ AC</span>}
                    {car.driverIncluded && (
                      <span className="badge badge-green">🧑‍✈️ Driver</span>
                    )}
                    <span className="badge badge-gray">
                      📞 {car.leadCount} {t("leadsLabel")}
                    </span>
                    <span className="badge badge-gray">
                      📋 {car.bookingCount} {t("bookingsLabel")}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={car.availability}
                        onChange={() => toggleCarAvailability(car)}
                      />
                      <span className="toggle-slider" />
                    </label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-success"
                        onClick={() => startEdit(car)}
                      >
                        {t("editCar")}
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => deleteCar(car._id)}
                      >
                        {t("deleteCar")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" && (
        <div style={{ padding: "16px" }}>
          {/* Approval Status inline banner */}
          {ownerProfile && !ownerProfile.isApproved && (
            <div
              style={{
                padding: "12px 14px",
                background: "#FFF7ED",
                border: "1px solid #FED7AA",
                borderRadius: "12px",
                display: "flex",
                gap: "10px",
                marginBottom: "14px",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: "20px" }}>⏳</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#EA580C",
                  }}
                >
                  {t("pendingApprovalTitle")}
                </div>
                <div
                  style={{ fontSize: "12px", color: "#EA580C", opacity: 0.8 }}
                >
                  समीक्षाधीन — अनुमोदन के बाद बुकिंग शुरू होगी।
                </div>
              </div>
              <button
                onClick={fetchOwnerProfile}
                style={{
                  background: "#F97316",
                  border: "none",
                  color: "white",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: "700",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                🔄 Refresh
              </button>
            </div>
          )}
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
                        {new Date(b.createdAt).toLocaleDateString("en-IN")}
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

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div style={{ padding: "24px 16px", paddingBottom: "100px" }}>
          {/* 1. Avatar / Info Card */}
          <div className="card" style={{ padding: "24px", textAlign: "center", marginBottom: "16px" }}>
            <div style={{ position: "relative", display: "inline-block", marginBottom: "12px" }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" onClick={() => setProfileImgOpen(true)}
                  style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "3px solid #E2E8F0", cursor: "pointer" }} />
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #F97316, #FB923C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", color: "white", fontWeight: "700" }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                style={{ position: "absolute", bottom: "0", right: "-4px", background: "#F97316", border: "none", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px" }}>
                📷
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            {avatarUploading && <p style={{ fontSize: "12px", color: "#F97316", marginBottom: "8px" }}>⏳ {t("uploading")}</p>}
            {user?.avatar && <p style={{ fontSize: "11px", color: "#94A3B8", marginBottom: "6px" }}>{t("tapPhotoToView")}</p>}
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "4px" }}>{user?.name}</h2>
            <p style={{ color: "#64748B", fontSize: "14px" }}>📱 {user?.phone}</p>
            <p style={{ color: "#64748B", fontSize: "14px" }}>🏙️ {user?.city}</p>
            {ownerProfile?.serviceCities?.length > 0 && (
              <div style={{ marginTop: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#EA580C", marginBottom: "4px" }}>📍 {lang === "hi" ? "सेवा क्षेत्र" : "Service Cities"}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
                  {ownerProfile.serviceCities.map((c) => (
                    <span key={c} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "999px", background: "#FFF7ED", color: "#C2410C", fontWeight: "600", border: "1px solid #FED7AA" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
            <span className="badge badge-orange" style={{ marginTop: "8px" }}>{t("carOwnerBadge")}</span>
          </div>

          {/* 2. Approval Status — shown prominently at top */}
          {(() => {
            const statusMap = {
              pending: { bg: "#FFF7ED", border: "#FED7AA", icon: "⏳", title: t("pendingApprovalTitle"), text: t("pendingApprovalText"), color: "#EA580C" },
              approved: { bg: "#F0FDF4", border: "#BBF7D0", icon: "✅", title: t("approvedTitle"), text: t("approvedText"), color: "#16A34A" },
              rejected: { bg: "#FEF2F2", border: "#FECACA", icon: "❌", title: t("rejectedTitle"), text: t("rejectedText"), color: "#DC2626" },
              suspended: { bg: "#FFF1F2", border: "#FECDD3", icon: "🚫", title: t("accountSuspended"), text: "आपका खाता निलंबित कर दिया गया है। इसे हल करने के लिए सहायता से संपर्क करें।", color: "#BE123C" },
            };
            const s = statusMap[ownerProfile?.isApproved ? "approved" : "pending"];
            return (
              <div style={{ padding: "14px 16px", background: s.bg, border: `1px solid ${s.border}`, borderRadius: "14px", display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "26px", flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: s.color }}>{s.title}</div>
                  <div style={{ fontSize: "12px", color: s.color, opacity: 0.8, lineHeight: "1.5", marginTop: "2px" }}>{s.text}</div>
                  {(user?.approvalStatus === "rejected" || user?.approvalStatus === "suspended") && (
                    <a href="https://wa.me/918878353787" style={{ fontSize: "12px", color: s.color, fontWeight: "700", marginTop: "6px", display: "inline-block" }}>💬 {t("contactSupport")}</a>
                  )}
                </div>
                {!ownerProfile?.isApproved && (
                  <button onClick={fetchOwnerProfile}
                    style={{ background: "#F97316", border: "none", color: "white", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "700", whiteSpace: "nowrap" }}>
                    🔄 Refresh
                  </button>
                )}
              </div>
            );
          })()}

          {/* 3. Language Selector */}
          <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>🌐 {t("language")}</div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{lang === "en" ? "English" : "हिंदी"}</div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                {["en", "hi"].map((l) => (
                  <button key={l} onClick={() => switchLang(l)}
                    style={{ padding: "7px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", border: "2px solid", cursor: "pointer", borderColor: lang === l ? "#F97316" : "#E2E8F0", background: lang === l ? "#F97316" : "white", color: lang === l ? "white" : "#64748B", transition: "all 0.15s" }}>
                    {l === "en" ? "🌐 EN" : "🇮🇳 HI"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Edit Name / Primary City */}
          <div className="card" style={{ padding: "16px", marginBottom: "12px" }}>
            <button onClick={() => { setEditNameOpen(!editNameOpen); setEditNameForm({ name: user?.name || "", city: ownerProfile?.city || user?.city || "", serviceCities: ownerProfile?.serviceCities || [] }); }}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>✏️</span>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>{t("editPersonalInfo")}</span>
              </div>
              <span style={{ fontSize: "18px", color: "#94A3B8", transform: editNameOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
            </button>
            {editNameOpen && (
              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{t("name")}</label>
                  <input className="input-field" value={editNameForm.name} onChange={(e) => setEditNameForm((f) => ({ ...f, name: e.target.value }))} placeholder="अपना नाम" style={{ padding: "10px 12px", fontSize: "14px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" }}>{t("city")} ({lang === "hi" ? "मुख्य शहर" : "Primary City"})</label>
                  <select className="input-field" value={editNameForm.city} onChange={(e) => setEditNameForm((f) => ({ ...f, city: e.target.value }))} style={{ padding: "10px 12px", fontSize: "14px" }}>
                    <option value="">{t("selectCity")}</option>
                    {availableLocations.map((c) => (<option key={c._id} value={c.city}>{lang === "hi" ? (c.nameHi || c.city) : c.city}</option>))}
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

          {/* 4b. Service Cities — simplified single-step card */}
          {(() => {
            const toggleCity = (cityEn) => setServiceCities(prev => prev.includes(cityEn) ? prev.filter(c => c !== cityEn) : [...prev, cityEn]);
            const saveCities = async () => {
              setSavingCities(true);
              try {
                await api.patch("/cars/owner-profile", { serviceCities });
                setOwnerProfile(prev => prev ? { ...prev, serviceCities } : prev);
                toast.success(lang === "hi" ? "✅ शहर सेव हो गए!" : "✅ Cities saved!");
              } catch {
                toast.error(lang === "hi" ? "अपडेट विफल" : "Update failed");
              } finally { setSavingCities(false); }
            };
            return (
              <div className="card" style={{ padding: "16px", marginBottom: "12px", background: "linear-gradient(135deg,#FFF7ED,#FFEDD5)", border: "1.5px solid #FED7AA" }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "26px" }}>📍</span>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#C2410C" }}>
                      {lang === "hi" ? "अपने सेवा शहर चुनें" : "Select Your Service Cities"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9A3412", marginTop: "2px" }}>
                      {lang === "hi" ? "जिन शहरों में गाड़ी चलाते हैं उन्हें टैप करें, फिर Save करें" : "Tap the cities you drive in, then tap Save"}
                    </div>
                  </div>
                </div>

                {/* Step indicator */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", borderRadius: "20px", padding: "5px 12px", border: "1.5px solid #FED7AA" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#C2410C", color: "white", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>1</span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#C2410C" }}>{lang === "hi" ? "शहर चुनें" : "Pick cities"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "white", borderRadius: "20px", padding: "5px 12px", border: "1.5px solid #FED7AA" }}>
                    <span style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#C2410C", color: "white", fontSize: "11px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#C2410C" }}>{lang === "hi" ? "Save दबाएं" : "Press Save"}</span>
                  </div>
                </div>

                {/* City buttons */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
                  {availableLocations.map((c) => {
                    const selected = serviceCities.includes(c.city);
                    return (
                      <button key={c._id} type="button" onClick={() => toggleCity(c.city)}
                        style={{
                          padding: "10px 18px", borderRadius: "25px", fontSize: "14px", fontWeight: "700",
                          border: `2.5px solid ${selected ? "#C2410C" : "#FED7AA"}`,
                          background: selected ? "#C2410C" : "white",
                          color: selected ? "white" : "#9A3412",
                          cursor: "pointer", transition: "all 0.15s",
                          boxShadow: selected ? "0 3px 10px rgba(194,65,12,0.3)" : "none"
                        }}>
                        {selected ? "✅ " : ""}{lang === "hi" ? (c.nameHi || c.city) : c.city}
                      </button>
                    );
                  })}
                </div>

                {/* Selected count */}
                {serviceCities.length > 0 ? (
                  <div style={{ fontSize: "12px", color: "#9A3412", fontWeight: "600", marginTop: "10px", marginBottom: "12px", background: "rgba(255,255,255,0.7)", borderRadius: "8px", padding: "8px 12px" }}>
                    ✅ {lang === "hi" ? `${serviceCities.length} शहर चुने: ` : `${serviceCities.length} selected: `}
                    <strong>{serviceCities.join(", ")}</strong>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#EA580C", fontWeight: "600", marginTop: "10px", marginBottom: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "8px 12px", textAlign: "center" }}>
                    👆 {lang === "hi" ? "ऊपर से कोई शहर टैप करें" : "Tap a city above to select it"}
                  </div>
                )}

                {/* Single Save button */}
                <button onClick={saveCities} disabled={savingCities || serviceCities.length === 0}
                  style={{
                    width: "100%", padding: "13px", borderRadius: "12px", border: "none",
                    background: serviceCities.length === 0 ? "#CBD5E1" : (savingCities ? "#FDBA74" : "#C2410C"),
                    color: "white", fontSize: "15px", fontWeight: "800",
                    cursor: serviceCities.length === 0 ? "not-allowed" : "pointer",
                    transition: "all 0.2s"
                  }}>
                  {savingCities
                    ? (lang === "hi" ? "⏳ सेव हो रहा है..." : "⏳ Saving...")
                    : (lang === "hi" ? "💾 शहर सेव करें" : "💾 Save Cities")}
                </button>
              </div>
            );
          })()}


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

          {/* 6. Logout — at bottom */}
          <button onClick={() => { logout(); navigate("/"); }} className="btn-danger"
            style={{ width: "100%", padding: "14px", fontSize: "15px", justifyContent: "center", marginTop: "8px" }}>
            🚪 {t("logout")}
          </button>

          {/* Profile Image Full-Size Modal */}
          {profileImgOpen && user?.avatar && (
            <div onClick={() => setProfileImgOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <button onClick={() => setProfileImgOpen(false)}
                style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(255,255,255,0.15)", border: "none", color: "white", width: "40px", height: "40px", borderRadius: "50%", fontSize: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>✕</button>
              <img src={user.avatar} alt="Profile" onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "90vw", maxHeight: "80vh", borderRadius: "16px", objectFit: "contain", boxShadow: "0 8px 48px rgba(0,0,0,0.6)", border: "3px solid rgba(255,255,255,0.15)" }} />
            </div>
          )}
        </div>
      )}

      {/* ── Videos Tab ── */}
      {activeTab === "videos" && (
        <CarOwnerVideoTab
          ownerId={ownerProfile?._id}
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

/* ───────────────────────────────────────
   CarOwnerVideoTab — isolated so logic
   stays separate from the main component
─────────────────────────────────────── */
function CarOwnerVideoTab({
  ownerId, myVideos, setMyVideos,
  videoUrl, setVideoUrl,
  videoTitle, setVideoTitle,
  videoUploading, setVideoUploading,
  videoError, setVideoError,
}) {
  useEffect(() => {
    if (!ownerId) return;
    api.get('/videos?limit=50').then(({ data }) => {
      setMyVideos((data.data || []).filter(v => v.uploaderId === ownerId.toString()));
    }).catch(() => {});
  }, [ownerId]);

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
      <div className="card" style={{ padding: '20px', marginBottom: '16px', background: 'linear-gradient(135deg,#EFF6FF,#E0E7FF)', border: '1.5px solid #BFDBFE' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#1E3A8A', marginBottom: '4px' }}>🎬 Upload YouTube Shorts</h3>
        <p style={{ fontSize: '12px', color: '#3730A3', marginBottom: '16px', lineHeight: '1.5' }}>
          Share your car! Only YouTube Shorts links are accepted
          (e.g. <code style={{ background: '#DBEAFE', padding: '1px 4px', borderRadius: '4px' }}>https://youtube.com/shorts/VIDEO_ID</code>)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="input-field" placeholder="https://youtube.com/shorts/..."
            value={videoUrl} onChange={e => { setVideoUrl(e.target.value); setVideoError(''); }}
            style={{ padding: '11px 12px', fontSize: '13px' }} />
          <input className="input-field" placeholder="Caption / title (optional)"
            value={videoTitle} onChange={e => setVideoTitle(e.target.value)}
            style={{ padding: '11px 12px', fontSize: '13px' }} />
          {videoError && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>
              ⚠️ {videoError}
            </div>
          )}
          <button onClick={handleUpload} disabled={videoUploading} className="btn-primary"
            style={{ padding: '12px', fontSize: '14px', opacity: videoUploading ? 0.7 : 1 }}>
            {videoUploading ? '⏳ Uploading…' : '📤 Upload Video'}
          </button>
        </div>
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>My Uploaded Videos ({myVideos.length})</h3>
      {myVideos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94A3B8' }}>
          <div style={{ fontSize: '40px' }}>🎬</div>
          <p style={{ fontSize: '13px', marginTop: '8px' }}>No videos yet. Upload your first YouTube Short!</p>
        </div>
      ) : (
        myVideos.map(v => (
          <div key={v._id} className="card" style={{ padding: '14px', marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <img src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`} alt="thumb"
              style={{ width: '100px', height: '56px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {v.title || 'Untitled'}
              </p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>{new Date(v.createdAt).toLocaleDateString('en-IN')}</p>
              <a href={v.youtubeUrl} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '11px', color: '#4F46E5', textDecoration: 'none', fontWeight: '600' }}>
                ▶ View on YouTube
              </a>
            </div>
            <button onClick={() => handleDelete(v._id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#EF4444', padding: '4px', flexShrink: 0 }}
              title="Delete">🗑️</button>
          </div>
        ))
      )}
    </div>
  );
}

