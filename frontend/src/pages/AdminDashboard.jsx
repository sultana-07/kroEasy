import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ADMIN_WA = import.meta.env.VITE_ADMIN_WHATSAPP || '';

const ALL_SERVICES = [
  'Electrician', 'Plumber', 'Carpenter', 'Mason',
  'Beautician', 'AC Technician', 'Mehndi Artist', 'Helper',
  'Painter', 'Pest Control', 'CCTV Technician', 'Water Purifier',
  'Home Cleaning', 'Gardener', 'Driver',
];

function openWhatsApp(b) {
  const pd = b.providerDetails;
  const isLabour = b.providerType === 'labour';
  const providerPhone = pd?.userId?.phone || '';

  if (!providerPhone) {
    alert('Worker phone number not available.');
    return;
  }

  // Auto-add India country code if not already present
  const waNumber = providerPhone.startsWith('91') ? providerPhone : `91${providerPhone}`;

  const providerName = pd?.userId?.name || '—';  // Always show owner/worker name, not car name
  const customerName = b.userId?.name || 'Guest';
  const customerPhone = b.userId?.phone || '—';
  const bookedOn = new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const notes = b.notes || 'None';
  const status = b.status?.toUpperCase() || '—';
  const carInfo = !isLabour && b.carId ? `${b.carId.carName || ''} ${b.carId.modelYear || ''} • ₹${b.carId.basePrice || '—'}` : null;

  const msg = [
    `🔔 *नई बुकिंग आई है! — KroEasy*`,
    ``,
    `नमस्ते ${providerName} जी,`,
    `आपके पास एक नई बुकिंग आई है। कृपया ग्राहक से संपर्क करें।`,
    ``,
    `👤 *ग्राहक का नाम:* ${customerName}`,
    `📱 *ग्राहक का नंबर:* ${customerPhone}`,
    ``,
    carInfo ? `🚗 *गाड़ी:* ${carInfo}` : null,
    `📅 *बुकिंग दिनांक:* ${bookedOn}`,
    `📋 *स्थिति:* ${status}`,
    `💬 *नोट्स:* ${notes}`,
    ``,
    `⚡ *जल्दी ग्राहक से बात करें और KroEasy app में जाकर booking confirm करें।*`,
    ``,
    `धन्यवाद 🙏`,
  ].filter(Boolean).join('\n');

  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}


export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [autocomplete, setAutocomplete] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ recentBookings: [], recentCallLogs: [] });
  const [labours, setLabours] = useState([]);
  const [labourTotal, setLabourTotal] = useState(0);
  const [carOwners, setCarOwners] = useState([]);
  const [carOwnerTotal, setCarOwnerTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [providerStats, setProviderStats] = useState({ labourStats: [], carOwnerStats: [] });
  const [activitySubTab, setActivitySubTab] = useState('bookings');
  const [labourView, setLabourView] = useState('manage');
  const [carView, setCarView] = useState('manage');
  const [loading, setLoading] = useState(true);
  const [passwordResets, setPasswordResets] = useState([]);
  // Track which car owner's car sub-panel is open (for booking count adjust)
  const [carCountPanelOwner, setCarCountPanelOwner] = useState(null);
  // Local cars list for admin car booking count — fetched lazily
  const [adminCars, setAdminCars] = useState([]);
  // Broadcast notification state
  const [bcTitle, setBcTitle] = useState('');
  const [bcBody, setBcBody] = useState('');
  const [bcRole, setBcRole] = useState('all');
  const [bcSending, setBcSending] = useState(false);
  // City Partners state
  const [cityPartners, setCityPartners] = useState([]);
  const [cpLoading, setCpLoading] = useState(false);
  const [cpForm, setCpForm] = useState({ name: '', phone: '', password: '', city: '' });
  const [cpFormOpen, setCpFormOpen] = useState(false);
  const [cpSaving, setCpSaving] = useState(false);
  const [cpExpandedId, setCpExpandedId] = useState(null);
  const [cpDetails, setCpDetails] = useState({});   // { [partnerId]: { stats, recentBookings, pendingWorkers, pendingOwners } }
  const [cpDetailLoading, setCpDetailLoading] = useState('');
  // Partner cities are loaded dynamically from the active locations
  // Banners state
  const [banners, setBanners] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerLink, setBannerLink] = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const [editLinkId, setEditLinkId] = useState(null);
  const [editLinkVal, setEditLinkVal] = useState('');
  // ── Videos state ──
  const [adminVideos, setAdminVideos] = useState([]);
  const [videoTabLoading, setVideoTabLoading] = useState(false);
  // ── Locations state ──
  const [locations, setLocations] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locForm, setLocForm] = useState({ city: '', nameHi: '', pincode: '', areas: '', isActive: true, enabledServices: [] });
  const [locEditId, setLocEditId] = useState(null);
  const [locSaving, setLocSaving] = useState(false);
  // Per-area inline manager
  const [areaInputs, setAreaInputs] = useState({}); // { [locId]: string }
  const [areaSaving, setAreaSaving] = useState(''); // locId currently saving
  // ── User Address Modal state ──
  const [addrModalUser, setAddrModalUser] = useState(null);

  // ── Subscriptions state ──
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setSubsLoading(true);
    try {
      const { data } = await api.get('/subscription/admin/all');
      setSubs(data);
    } catch { toast.error('Failed to load subscriptions'); }
    finally { setSubsLoading(false); }
  };

  const handleSubOverride = async (subId, updateData) => {
    try {
      await api.patch(`/subscription/admin/${subId}/override`, updateData);
      toast.success('Subscription updated successfully');
      fetchSubscriptions();
    } catch { toast.error('Failed to update subscription'); }
  };

  const sendBroadcast = async () => {
    if (!bcTitle.trim() || !bcBody.trim()) { toast.error('Title and message are required'); return; }
    setBcSending(true);
    try {
      const { data } = await api.post('/admin/broadcast-notification', { title: bcTitle, body: bcBody, role: bcRole });
      toast.success(`✅ ${data.message}`);
      setBcTitle(''); setBcBody('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send notification');
    } finally { setBcSending(false); }
  };

  const fetchCityPartners = async () => {
    setCpLoading(true);
    try {
      const { data } = await api.get('/admin/city-partners');
      setCityPartners(data);
    } catch { toast.error('Failed to load city partners'); }
    finally { setCpLoading(false); }
  };

  const fetchPartnerDetails = async (partnerId) => {
    if (cpDetails[partnerId]) return; // already loaded, use cache
    setCpDetailLoading(partnerId);
    try {
      const { data } = await api.get(`/admin/city-partners/${partnerId}/stats`);
      setCpDetails(prev => ({ ...prev, [partnerId]: data }));
    } catch { toast.error('Failed to load partner details'); }
    finally { setCpDetailLoading(''); }
  };

  const togglePartnerExpand = (partnerId) => {
    if (cpExpandedId === partnerId) {
      setCpExpandedId(null);
    } else {
      setCpExpandedId(partnerId);
      fetchPartnerDetails(partnerId);
    }
  };

  const refreshPartnerDetails = async (partnerId) => {
    setCpDetailLoading(partnerId);
    setCpDetails(prev => { const n = { ...prev }; delete n[partnerId]; return n; });
    try {
      const { data } = await api.get(`/admin/city-partners/${partnerId}/stats`);
      setCpDetails(prev => ({ ...prev, [partnerId]: data }));
    } catch { toast.error('Failed to refresh'); }
    finally { setCpDetailLoading(''); }
  };

  const createCityPartner = async () => {
    if (!cpForm.name || !cpForm.phone || !cpForm.password || !cpForm.city) {
      toast.error('All fields are required'); return;
    }
    setCpSaving(true);
    try {
      const { data } = await api.post('/admin/city-partners', cpForm);
      setCityPartners(prev => [data, ...prev]);
      setCpForm({ name: '', phone: '', password: '', city: '' });
      setCpFormOpen(false);
      toast.success(`✅ City Partner created for ${data.city}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create city partner');
    } finally { setCpSaving(false); }
  };

  const deleteCityPartner = async (id, name) => {
    if (!window.confirm(`Delete city partner "${name}"?`)) return;
    try {
      await api.delete(`/admin/city-partners/${id}`);
      setCityPartners(prev => prev.filter(p => p._id !== id));
      toast.success('City partner deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const fetchBanners = async () => {
    setBannerLoading(true);
    try {
      const { data } = await api.get('/admin/admin-banners');
      setBanners(data);
    } catch { toast.error('Failed to load banners'); }
    finally { setBannerLoading(false); }
  };

  const uploadBanner = async () => {
    if (!bannerFile) { toast.error('Please choose an image'); return; }
    setBannerUploading(true);
    try {
      const form = new FormData();
      form.append('image', bannerFile);
      form.append('link', bannerLink.trim());
      const { data } = await api.post('/admin/admin-banners', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setBanners(prev => [...prev, data]);
      setBannerFile(null);
      setBannerLink('');
      toast.success('Banner uploaded!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setBannerUploading(false); }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/admin/admin-banners/${id}`);
      setBanners(prev => prev.filter(b => b._id !== id));
      toast.success('Banner deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleBannerActive = async (id, isActive) => {
    try {
      const { data } = await api.patch(`/admin/admin-banners/${id}`, { isActive });
      setBanners(prev => prev.map(b => b._id === id ? data : b));
    } catch { toast.error('Failed to update'); }
  };

  const saveBannerLink = async (id) => {
    try {
      const { data } = await api.patch(`/admin/admin-banners/${id}`, { link: editLinkVal.trim() });
      setBanners(prev => prev.map(b => b._id === id ? data : b));
      setEditLinkId(null);
      toast.success('Link saved');
    } catch { toast.error('Failed to save link'); }
  };

  // ── Location Handlers ──
  const fetchLocations = async () => {
    setLocLoading(true);
    try {
      const { data } = await api.get('/admin/locations');
      setLocations(data);
    } catch { toast.error('Failed to load locations'); }
    finally { setLocLoading(false); }
  };

  const saveLocation = async (e) => {
    e.preventDefault();
    if (!locForm.city.trim()) { toast.error('City name is required'); return; }
    setLocSaving(true);
    try {
      const payload = { 
        city: locForm.city.trim(),
        nameHi: locForm.nameHi.trim(),
        pincode: locForm.pincode.trim(),
        areas: locForm.areas.split(',').map(a => a.trim()).filter(Boolean),
        isActive: locForm.isActive,
        enabledServices: locForm.enabledServices,
      };
      if (locEditId) {
        const { data } = await api.put(`/admin/locations/${locEditId}`, payload);
        setLocations(prev => prev.map(l => l._id === locEditId ? data : l));
        toast.success('Location updated');
      } else {
        const { data } = await api.post('/admin/locations', payload);
        setLocations(prev => [...prev, data]);
        toast.success('Location added');
      }
      setLocForm({ city: '', nameHi: '', pincode: '', areas: '', isActive: true, enabledServices: [] });
      setLocEditId(null);
    } catch { toast.error('Failed to save location'); }
    finally { setLocSaving(false); }
  };

  const deleteLocation = async (id) => {
    if (!window.confirm('Delete this location?')) return;
    try {
      await api.delete(`/admin/locations/${id}`);
      setLocations(prev => prev.filter(l => l._id !== id));
      toast.success('Location deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const editLocation = (loc) => {
    setLocEditId(loc._id);
    // Areas: handle both string[] (old) and {name,isActive}[] (new)
    const areasStr = (loc.areas || []).map(a => typeof a === 'string' ? a : a.name).join(', ');
    setLocForm({
      city: loc.city,
      nameHi: loc.nameHi || '',
      pincode: loc.pincode || '',
      areas: areasStr,
      isActive: loc.isActive !== undefined ? loc.isActive : true,
      enabledServices: loc.enabledServices || [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Inline Area Manager Handlers ──
  const addArea = async (locId) => {
    const name = (areaInputs[locId] || '').trim();
    if (!name) { toast.error('Area name is required'); return; }
    setAreaSaving(locId);
    try {
      const { data } = await api.post(`/admin/locations/${locId}/areas`, { name });
      setLocations(prev => prev.map(l => l._id === locId ? data : l));
      setAreaInputs(prev => ({ ...prev, [locId]: '' }));
      toast.success(`✅ Area "${name}" added`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add area');
    } finally { setAreaSaving(''); }
  };

  const toggleArea = async (locId, areaName) => {
    try {
      const { data } = await api.patch(`/admin/locations/${locId}/areas/${encodeURIComponent(areaName)}/toggle`);
      setLocations(prev => prev.map(l => l._id === locId ? data : l));
    } catch { toast.error('Failed to toggle area'); }
  };

  const deleteArea = async (locId, areaName) => {
    if (!window.confirm(`Delete area "${areaName}"?`)) return;
    try {
      const { data } = await api.delete(`/admin/locations/${locId}/areas/${encodeURIComponent(areaName)}`);
      setLocations(prev => prev.map(l => l._id === locId ? data : l));
      toast.success('Area deleted');
    } catch { toast.error('Failed to delete area'); }
  };


  // (geo/map helpers removed — not needed for text-only locations tab)
  useEffect(() => { fetchAll(); fetchLocations(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, laboursRes, ownersRes, usersRes, psRes, resetRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/activity'),
        api.get('/admin/labours'),
        api.get('/admin/carowners'),
        api.get('/admin/users'),
        api.get('/admin/provider-stats'),
        api.get('/admin/password-resets'),
      ]);
      setStats(statsRes.data);
      setActivity(activityRes.data);
      setLabours(laboursRes.data.data);
      setLabourTotal(laboursRes.data.total);
      setCarOwners(ownersRes.data.data);
      setCarOwnerTotal(ownersRes.data.total);
      setUsers(usersRes.data.data);
      setUserTotal(usersRes.data.total);
      setProviderStats(psRes.data);
      setPasswordResets(resetRes.data);
    } catch { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const approveLabour = async (id, isApproved) => {
    try {
      await api.patch(`/admin/approve-labour/${id}`, { isApproved });
      setLabours(labours.map(l => l._id === id ? { ...l, isApproved } : l));
      toast.success(isApproved ? '✅ Provider approved' : '❌ Provider rejected');
    } catch { toast.error('Failed to update'); }
  };

  const approveCarOwner = async (id, isApproved) => {
    try {
      await api.patch(`/admin/approve-carowner/${id}`, { isApproved });
      setCarOwners(carOwners.map(o => o._id === id ? { ...o, isApproved } : o));
      toast.success(isApproved ? '✅ Car Owner approved' : '❌ Car Owner rejected');
    } catch { toast.error('Failed to update'); }
  };

  const suspendUser = async (id, isSuspended) => {
    try {
      await api.patch(`/admin/suspend-user/${id}`, { isSuspended });
      setUsers(users.map(u => u._id === id ? { ...u, isSuspended } : u));
      toast.success(isSuspended ? '⛔ User suspended' : '✅ User unsuspended');
    } catch { toast.error('Failed to update'); }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`"${name}" को डेटाबेस से हटाएं? यह क्रिया पूर्ववत नहीं हो सकती।`)) return;
    try {
      await api.delete(`/admin/delete-user/${id}`);
      setUsers(users.filter(u => u._id !== id));
      setUserTotal(prev => prev - 1);
      toast.success('User permanently deleted');
    } catch { toast.error('Failed to delete user'); }
  };

  const deleteLabour = async (id, name) => {
    if (!window.confirm(`"${name}" को डेटाबेस से हटाएं? उनका यूज़र अकाउंट भी हट जाएगा।`)) return;
    try {
      await api.delete(`/admin/delete-labour/${id}`);
      setLabours(labours.filter(l => l._id !== id));
      setLabourTotal(prev => prev - 1);
      toast.success('Provider permanently deleted');
    } catch { toast.error('Failed to delete provider'); }
  };

  const deleteCarOwner = async (id, name) => {
    if (!window.confirm(`"${name}" को डेटाबेस से हटाएं? उनकी सभी कारें और यूज़र अकाउंट भी हट जाएंगे।`)) return;
    try {
      await api.delete(`/admin/delete-carowner/${id}`);
      setCarOwners(carOwners.filter(o => o._id !== id));
      setCarOwnerTotal(prev => prev - 1);
      toast.success('Car owner permanently deleted');
    } catch { toast.error('Failed to delete car owner'); }
  };

  // ── Admin booking count adjust handlers ────────────────────────────────────
  const adjustLabourCount = async (labourId, delta) => {
    try {
      const { data } = await api.patch(`/admin/labour-booking-count/${labourId}`, { delta });
      setProviderStats(prev => ({
        ...prev,
        labourStats: prev.labourStats.map(l =>
          l._id === labourId ? { ...l, totalBookings: data.bookingCount } : l
        ),
      }));
      toast.success(delta === 1 ? '✅ Booking count increased' : '✅ Booking count decreased');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update count');
    }
  };

  const fetchAdminCars = async () => {
    try {
      const { data } = await api.get('/admin/all-cars');
      setAdminCars(data);
    } catch { toast.error('Failed to load cars'); }
  };

  const adjustCarCount = async (carId, delta) => {
    try {
      const { data } = await api.patch(`/admin/car-booking-count/${carId}`, { delta });
      setAdminCars(prev => prev.map(c => c._id === carId ? { ...c, bookingCount: data.bookingCount } : c));
      toast.success(delta === 1 ? '✅ Booking count increased' : '✅ Booking count decreased');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update count');
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const onAddrPlaceChanged = () => {
    if (addrAutocomplete !== null) {
      const place = addrAutocomplete.getPlace();
      if (place.geometry) {
        setAddrForm(prev => ({
          ...prev,
          address: place.formatted_address || place.name,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        }));
      }
    }
  };

  const useCurrentAddrLocation = () => {
    if (!navigator.geolocation) { toast.error('Not supported'); return; }
    navigator.geolocation.getCurrentPosition(pos => {
      setAddrForm(prev => ({ ...prev, location: { lat: pos.coords.latitude, lng: pos.coords.longitude } }));
      toast.success('Location updated');
    });
  };

  const saveUserAddress = async (e) => {
    e.preventDefault();
    if (!addrModalUser) return;
    setAddrSaving(true);
    try {
      const payload = {
        label: addrForm.label,
        address: addrForm.address,
        location: {
          type: 'Point',
          coordinates: [addrForm.location.lng, addrForm.location.lat]
        }
      };
      await api.post(`/admin/users/${addrModalUser._id}/addresses`, payload);
      toast.success('Address added');
      // Refresh user data in list
      const { data } = await api.get('/admin/users');
      setUsers(data.data);
      // Close modal
      setAddrModalUser(null);
      setAddrForm({ label: 'Home', address: '', location: { lat: 28.6139, lng: 77.2090 } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add address');
    } finally { setAddrSaving(false); }
  };

  const deleteUserAddress = async (userId, addrId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api.delete(`/admin/users/${userId}/addresses/${addrId}`);
      toast.success('Address deleted');
      const { data } = await api.get('/admin/users');
      setUsers(data.data);
      // Update modal user if currently open
      if (addrModalUser?._id === userId) {
        setAddrModalUser(prev => ({
          ...prev,
          savedAddresses: prev.savedAddresses.filter(a => a._id !== addrId)
        }));
      }
    } catch { toast.error('Failed to delete'); }
  };

  const chartData = stats ? [
    { name: 'Users', value: stats.users, fill: '#1E3A8A' },
    { name: 'Providers', value: stats.labours, fill: '#F97316' },
    { name: 'Car Owners', value: stats.carOwners, fill: '#16A34A' },
    { name: 'Cars', value: stats.cars, fill: '#8B5CF6' },
    { name: 'Bookings', value: stats.bookings, fill: '#EC4899' },
    { name: 'Call Logs', value: stats.callLogs, fill: '#F59E0B' },
    { name: 'Installs', value: stats.pwaInstalls, fill: '#0891B2' },
    { name: 'Notif.', value: stats.notifSubscribers, fill: '#7C3AED' },
  ] : [];

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-container" style={{ paddingBottom: '24px' }}>
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>🛡️ Admin Panel</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user?.name}</div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0', overflowX: 'auto' }}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'labours', label: '🔧 Providers' },
          { key: 'carowners', label: '🚗 Car Owners' },
          { key: 'users', label: '👤 Users' },
          { key: 'activity', label: '📋 Activity' },
          { key: 'passwordResets', label: '🔑 Resets' },
          { key: 'broadcast', label: '📣 Broadcast' },
          { key: 'cityPartners', label: '🏙️ City Partners' },
          { key: 'banners', label: '🖼️ Banners' },
          { key: 'locations', label: '📍 Cities/Areas' },
          { key: 'videos', label: '🎬 Videos' },
          { key: 'subs', label: '💳 Subs' },
        ].map(tab => (
          <button key={tab.key} onClick={() => {
            setActiveTab(tab.key);
            if (tab.key === 'cityPartners') fetchCityPartners();
            if (tab.key === 'banners') fetchBanners();
            if (tab.key === 'locations') fetchLocations();
            if (tab.key === 'videos') {
              setVideoTabLoading(true);
              api.get('/videos/admin/all?limit=100')
                .then(({ data }) => setAdminVideos(data.data || []))
                .catch(() => toast.error('Failed to load videos'))
                .finally(() => setVideoTabLoading(false));
            }
            if (tab.key === 'subs') fetchSubscriptions();
          }} style={{ flexShrink: 0, padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: activeTab === tab.key ? '#1E3A8A' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent', whiteSpace: 'nowrap' }}>{tab.label}</button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Users', value: stats?.users, icon: '👤', color: '#1E3A8A' },
              { label: 'Providers', value: stats?.labours, icon: '🔧', color: '#F97316' },
              { label: 'Car Owners', value: stats?.carOwners, icon: '🚗', color: '#16A34A' },
              { label: 'Cars', value: stats?.cars, icon: '🚙', color: '#8B5CF6' },
              { label: 'Bookings', value: stats?.bookings, icon: '📋', color: '#EC4899' },
              { label: 'Call Logs', value: stats?.callLogs, icon: '📞', color: '#F59E0B' },
              { label: 'PWA Installs', value: stats?.pwaInstalls, icon: '📲', color: '#0891B2' },
              { label: 'Notif. Subscribers', value: stats?.notifSubscribers, icon: '🔔', color: '#7C3AED' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ padding: '14px 8px' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value || 0}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px' }}>📊 Platform Overview</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#1E3A8A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Labour Tab */}
      {activeTab === 'labours' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🔧 Service Providers ({labourTotal})</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['manage', 'stats'].map(v => (
                <button key={v} onClick={() => setLabourView(v)}
                  style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: labourView === v ? '#1E3A8A' : '#F1F5F9', color: labourView === v ? 'white' : '#374151' }}>
                  {v === 'manage' ? '⚙️ Manage' : '📊 Stats'}
                </button>
              ))}
            </div>
          </div>

          {labourView === 'manage' && (
            labours.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No service providers registered yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {labours.map(l => (
                  <div key={l._id} className="card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{l.userId?.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {l.userId?.phone} • 🏙️ {l.userId?.city}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                          {l.skills?.slice(0, 3).map(s => <span key={s} className="badge badge-blue" style={{ fontSize: '11px' }}>{s}</span>)}
                        </div>
                      </div>
                      <span className={`badge ${l.isApproved ? 'badge-green' : 'badge-orange'}`}>{l.isApproved ? '✅ Approved' : '⏳ Pending'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn-success" onClick={() => approveLabour(l._id, true)}
                        style={{ opacity: l.isApproved ? 1 : 0.5, fontWeight: l.isApproved ? '800' : '400' }}>✅ Approve</button>
                      <button className="btn-danger" onClick={() => approveLabour(l._id, false)}
                        style={{ opacity: !l.isApproved ? 1 : 0.5, fontWeight: !l.isApproved ? '800' : '400' }}>❌ Reject</button>
                      <button
                        onClick={() => deleteLabour(l._id, l.userId?.name)}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#DC2626' }}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {labourView === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {providerStats.labourStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No data yet</div>
              ) : (
                providerStats.labourStats.sort((a, b) => b.monthBookings - a.monthBookings).map(l => (
                  <div key={l._id} className="card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{l.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>📱 {l.phone} • 🏙️ {l.city}</div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {l.skills?.slice(0, 3).map(s => <span key={s} className="badge badge-blue" style={{ fontSize: '10px' }}>{s}</span>)}
                        </div>
                      </div>
                      <span className={`badge ${l.isApproved ? 'badge-green' : 'badge-orange'}`}>{l.isApproved ? '✅' : '⏳'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Total Bookings with +/- admin controls */}
                      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>{l.totalBookings}</div>
                        <div style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'pre-line', lineHeight: '1.3', marginTop: '3px', marginBottom: '6px' }}>{'📋 Total\nBookings'}</div>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button onClick={() => adjustLabourCount(l._id, -1)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', fontSize: '16px', fontWeight: '800', lineHeight: 1 }}>−</button>
                          <button onClick={() => adjustLabourCount(l._id, 1)}
                            style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#16A34A', fontSize: '16px', fontWeight: '800', lineHeight: 1 }}>+</button>
                        </div>
                      </div>
                      {[
                        { label: '✅ Completed\nBookings', val: l.completedBookings, color: '#16A34A' },
                        { label: '📞 Calls\nToday', val: l.todayCalls, color: '#DC2626' },
                        { label: '📞 Calls\nThis Month', val: l.monthCalls, color: '#2563EB' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'pre-line', lineHeight: '1.3', marginTop: '3px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', marginBottom: '6px' }}>👁️ Profile Views</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                        {[
                          { label: 'Total', val: l.totalViews || 0 },
                          { label: 'Today', val: l.todayViews || 0 },
                          { label: 'Week', val: l.weekViews || 0 },
                          { label: 'Month', val: l.monthViews || 0 },
                        ].map((v, i) => (
                          <div key={i} style={{ background: '#F5F3FF', borderRadius: '8px', padding: '8px 4px', textAlign: 'center', border: '1px solid #DDD6FE' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#7C3AED' }}>{v.val}</div>
                            <div style={{ fontSize: '9px', color: '#6D28D9', marginTop: '2px' }}>{v.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Car Owners Tab */}
      {activeTab === 'carowners' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🚗 Car Owners ({carOwnerTotal})</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['manage', 'stats'].map(v => (
                <button key={v} onClick={() => setCarView(v)}
                  style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: carView === v ? '#1E3A8A' : '#F1F5F9', color: carView === v ? 'white' : '#374151' }}>
                  {v === 'manage' ? '⚙️ Manage' : '📊 Stats'}
                </button>
              ))}
            </div>
          </div>

          {carView === 'manage' && (
            carOwners.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No car owners registered yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {carOwners.map(o => (
                  <div key={o._id} className="card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{o.userId?.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {o.userId?.phone} • 🏙️ {o.userId?.city}</div>
                      </div>
                      <span className={`badge ${o.isApproved ? 'badge-green' : 'badge-orange'}`}>{o.isApproved ? '✅ Approved' : '⏳ Pending'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button className="btn-success" onClick={() => approveCarOwner(o._id, true)}
                        style={{ opacity: o.isApproved ? 1 : 0.5, fontWeight: o.isApproved ? '800' : '400' }}>✅ Approve</button>
                      <button className="btn-danger" onClick={() => approveCarOwner(o._id, false)}
                        style={{ opacity: !o.isApproved ? 1 : 0.5, fontWeight: !o.isApproved ? '800' : '400' }}>❌ Reject</button>
                      <button
                        onClick={() => deleteCarOwner(o._id, o.userId?.name)}
                        style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '700', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#DC2626' }}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {carView === 'stats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {providerStats.carOwnerStats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No data yet</div>
              ) : (
                providerStats.carOwnerStats.sort((a, b) => b.monthBookings - a.monthBookings).map(o => (
                  <div key={o._id} className="card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{o.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>📱 {o.phone} • 🏙️ {o.city}</div>
                      </div>
                      <span className={`badge ${o.isApproved ? 'badge-green' : 'badge-orange'}`}>{o.isApproved ? '✅' : '⏳'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Total Bookings with car-level +/- controls */}
                      <div style={{ background: '#F8FAFC', borderRadius: '10px', padding: '10px 8px', textAlign: 'center', border: '1px solid #E2E8F0', gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A' }}>{o.totalBookings}</div>
                        <div style={{ fontSize: '10px', color: '#64748B', marginTop: '3px', marginBottom: '6px' }}>📋 Total Bookings (per car below)</div>
                        <button
                          onClick={() => {
                            if (carCountPanelOwner === o._id) {
                              setCarCountPanelOwner(null);
                            } else {
                              setCarCountPanelOwner(o._id);
                              fetchAdminCars();
                            }
                          }}
                          style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: carCountPanelOwner === o._id ? '#E0E7FF' : '#EFF6FF', color: '#1E3A8A', fontWeight: '600' }}
                        >{carCountPanelOwner === o._id ? '▲ Hide Cars' : '▼ Adjust Per Car'}</button>
                        {carCountPanelOwner === o._id && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                            {adminCars.filter(c => c.ownerId === o._id || c.ownerId?.toString() === o._id?.toString()).length === 0
                              ? <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', padding: '6px' }}>No cars found</div>
                              : adminCars.filter(c => c.ownerId === o._id || c.ownerId?.toString() === o._id?.toString()).map(car => (
                                <div key={car._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', borderRadius: '8px', padding: '6px 8px', border: '1px solid #E2E8F0' }}>
                                  <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#0F172A' }}>{car.carName} {car.modelYear}</div>
                                    <div style={{ fontSize: '11px', color: '#64748B' }}>Bookings: <strong>{car.bookingCount || 0}</strong></div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => adjustCarCount(car._id, -1)}
                                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEE2E2', color: '#DC2626', fontSize: '16px', fontWeight: '800', lineHeight: 1 }}>−</button>
                                    <button onClick={() => adjustCarCount(car._id, 1)}
                                      style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#DCFCE7', color: '#16A34A', fontSize: '16px', fontWeight: '800', lineHeight: 1 }}>+</button>
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                      {[
                        { label: '✅ Completed\nBookings', val: o.completedBookings, color: '#16A34A' },
                        { label: '📞 Calls\nToday', val: o.todayCalls, color: '#DC2626' },
                        { label: '📞 Calls\nThis Month', val: o.monthCalls, color: '#2563EB' },
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#F8FAFC', borderRadius: '10px', padding: '12px 8px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: '10px', color: '#64748B', whiteSpace: 'pre-line', lineHeight: '1.3', marginTop: '3px' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', marginBottom: '6px' }}>👁️ Profile Views</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px' }}>
                        {[
                          { label: 'Total', val: o.totalViews || 0 },
                          { label: 'Today', val: o.todayViews || 0 },
                          { label: 'Week', val: o.weekViews || 0 },
                          { label: 'Month', val: o.monthViews || 0 },
                        ].map((v, i) => (
                          <div key={i} style={{ background: '#F5F3FF', borderRadius: '8px', padding: '8px 4px', textAlign: 'center', border: '1px solid #DDD6FE' }}>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#7C3AED' }}>{v.val}</div>
                            <div style={{ fontSize: '9px', color: '#6D28D9', marginTop: '2px' }}>{v.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>👤 User Management ({userTotal})</h3>
          {users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No users yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(u => (
                <div key={u._id} className="card" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{u.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {u.phone} • {u.role}</div>
                      {u.city && <div style={{ fontSize: '12px', color: '#4F46E5', fontWeight: '600', marginTop: '2px' }}>🏙️ {u.city}</div>}
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span className={`badge ${u.isSuspended ? 'badge-red' : 'badge-green'}`}>{u.isSuspended ? '⛔ Suspended' : '✅ Active'}</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setAddrModalUser(u)}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', cursor: 'pointer', background: 'white', color: '#1E3A8A', fontWeight: '700' }}
                        >📍 Addresses ({u.savedAddresses?.length || 0})</button>
                        {u.role !== 'admin' && (
                          <>
                            <button
                              onClick={() => suspendUser(u._id, !u.isSuspended)}
                              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: u.isSuspended ? '#F0FDF4' : '#FEF2F2', color: u.isSuspended ? '#16A34A' : '#DC2626', fontWeight: '600' }}
                            >{u.isSuspended ? 'Unsuspend' : 'Suspend'}</button>
                            <button
                              onClick={() => deleteUser(u._id, u.name)}
                              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#DC2626', fontWeight: '700' }}
                            >Delete</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div style={{ padding: '16px' }}>
          {/* Sub-tab switcher */}
          <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '12px', padding: '4px', marginBottom: '16px', gap: '4px' }}>
            {[
              { key: 'bookings', label: '📋 Bookings', count: activity.recentBookings.length },
              { key: 'calllogs', label: '📞 Call Logs', count: activity.recentCallLogs.length },
            ].map(st => (
              <button key={st.key} onClick={() => setActivitySubTab(st.key)}
                style={{ flex: 1, padding: '8px 0', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700',
                  background: activitySubTab === st.key ? 'white' : 'transparent',
                  color: activitySubTab === st.key ? '#1E3A8A' : '#64748B',
                  boxShadow: activitySubTab === st.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{st.label} <span style={{ fontSize: '11px', opacity: 0.7 }}>({st.count})</span></button>
            ))}
          </div>

          {/* Bookings sub-tab */}
          {activitySubTab === 'bookings' && (
            activity.recentBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No bookings yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activity.recentBookings.map(b => {
                  const pd = b.providerDetails;
                  const providerName = b.providerType === 'labour' ? pd?.userId?.name : (b.carId?.carName || pd?.userId?.name);
                  const providerPhone = pd?.userId?.phone;
                  const providerCity = pd?.userId?.city;
                  const providerSkills = pd?.skills;
                  return (
                    <div key={b._id} className="card" style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '6px 10px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>👤 Customer</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A' }}>{b.userId?.name || 'Guest'}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>📱 {b.userId?.phone}</div>
                        </div>
                        <div style={{ fontSize: '18px', color: '#94a3b8' }}>→</div>
                        <div style={{ background: '#F0FDF4', borderRadius: '8px', padding: '6px 10px', flex: 1, minWidth: '120px' }}>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{b.providerType === 'labour' ? '🔧 Service Provider' : '🚗 Car Booking'}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A' }}>{providerName || '—'}</div>
                          {providerPhone && <div style={{ fontSize: '11px', color: '#64748B' }}>📱 {providerPhone} {providerCity ? `• 🏙️ ${providerCity}` : ''}</div>}
                          {providerSkills?.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {providerSkills.slice(0, 2).map(s => <span key={s} className="badge badge-blue" style={{ fontSize: '10px' }}>{s}</span>)}
                            </div>
                          )}
                          {b.providerType === 'car' && b.carId && (
                            <div style={{ fontSize: '11px', color: '#64748B' }}>{b.carId.carName} {b.carId.modelYear} • ₹{b.carId.basePrice}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${b.status === 'pending' ? 'badge-orange' : b.status === 'confirmed' ? 'badge-green' : b.status === 'confirmed' ? 'badge-green' : 'badge-red'}`}>{b.status}</span>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                      </div>
                      {b.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#374151', fontStyle: 'italic' }}>💬 "{b.notes}"</div>}
                      <button
                        onClick={() => openWhatsApp(b)}
                        style={{ marginTop: '10px', width: '100%', padding: '9px', borderRadius: '10px', background: 'linear-gradient(135deg, #25D366, #128C7E)', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp Worker
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Call Logs sub-tab */}
          {activitySubTab === 'calllogs' && (
            activity.recentCallLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No call logs yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activity.recentCallLogs.map(c => {
                  const td = c.targetDetails;
                  const targetName = c.targetType === 'labour' ? td?.userId?.name : td?.carName;
                  const targetPhone = c.targetType === 'labour' ? td?.userId?.phone : c.phone;
                  const targetCity = c.targetType === 'labour' ? td?.userId?.city : td?.city;
                  return (
                    <div key={c._id} className="card" style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ background: '#EFF6FF', borderRadius: '8px', padding: '5px 10px' }}>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>👤 Caller</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A' }}>{c.userId?.name || 'Guest'}</div>
                          {c.userId?.phone && <div style={{ fontSize: '11px', color: '#64748B' }}>📱 {c.userId.phone}</div>}
                        </div>
                        <div style={{ fontSize: '16px', color: '#94a3b8' }}>→</div>
                        <div style={{ background: '#FFF7ED', borderRadius: '8px', padding: '5px 10px', flex: 1, minWidth: '100px' }}>
                          <div style={{ fontSize: '10px', color: '#64748B' }}>{c.targetType === 'labour' ? '🔧 Provider' : '🚗 Car'}</div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#EA580C' }}>{targetName || '—'}</div>
                          {targetPhone && <div style={{ fontSize: '11px', color: '#64748B' }}>📱 {targetPhone} {targetCity ? `• 🏙️ ${targetCity}` : ''}</div>}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'right' }}>
                          {new Date(c.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* Password Resets Tab */}
      {activeTab === 'passwordResets' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🔑 Password Reset Requests ({passwordResets.length})</h3>
            <button onClick={fetchAll} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: '600', cursor: 'pointer' }}>🔄 Refresh</button>
          </div>
          {passwordResets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <p style={{ fontWeight: '600' }}>No pending reset requests</p>
              <p style={{ fontSize: '13px' }}>All reset links have been used or expired</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: '#92400E', marginBottom: '4px' }}>
                ⚠️ These links expire in <strong>10 minutes</strong> from when the user submitted the request. Copy and send them quickly via WhatsApp/SMS.
              </div>
              {passwordResets.map(r => {
                const link = `${window.location.origin}/reset-password/${r.resetPasswordToken}`;
                const expiresAt = new Date(r.resetPasswordExpiry);
                const minsLeft = Math.max(0, Math.round((expiresAt - Date.now()) / 60000));
                return (
                  <div key={r._id} className="card" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{r.name}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {r.phone}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: minsLeft > 3 ? '#F0FDF4' : '#FEF2F2', color: minsLeft > 3 ? '#16A34A' : '#DC2626', border: `1px solid ${minsLeft > 3 ? '#BBF7D0' : '#FECACA'}` }}>
                        ⏱️ {minsLeft}m left
                      </span>
                    </div>
                    <div style={{ background: '#F8FAFC', borderRadius: '8px', padding: '8px 10px', fontSize: '11px', color: '#64748B', wordBreak: 'break-all', marginBottom: '10px', fontFamily: 'monospace' }}>
                      {link}
                    </div>
                    <button
                      onClick={() => { navigator.clipboard.writeText(link); toast.success('✅ Reset link copied to clipboard!'); }}
                      style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', border: 'none', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      📋 Copy Reset Link
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Broadcast Notification Tab */}
      {activeTab === 'broadcast' && (
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>📣 Broadcast Notification</h3>
          <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '16px' }}>
            Send a push notification to all users who have allowed notifications.
            {stats?.notifSubscribers != null && (
              <span style={{ marginLeft: '6px', background: '#F5F3FF', color: '#7C3AED', borderRadius: '20px', padding: '2px 10px', fontWeight: '700', fontSize: '12px' }}>
                🔔 {stats.notifSubscribers} subscribers ({stats.notifUsers} registered + {stats.notifGuests} guests)
              </span>
            )}
          </p>

          <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Role Filter */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>👥 Send To</label>
              <select value={bcRole} onChange={e => setBcRole(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '600', background: 'white', color: '#0F172A', outline: 'none' }}>
                <option value="all">🌍 Everyone (all roles)</option>
                <option value="user">👤 Customers only</option>
                <option value="labour">🔧 Service Providers only</option>
                <option value="carowner">🚗 Car Owners only</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>📌 Notification Title</label>
              <input
                type="text"
                placeholder="e.g. 🎉 New Feature!"
                value={bcTitle}
                onChange={e => setBcTitle(e.target.value)}
                maxLength={60}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'right', marginTop: '3px' }}>{bcTitle.length}/60</div>
            </div>

            {/* Body */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>✏️ Message</label>
              <textarea
                placeholder="e.g. Ab apni booking aur asaan ho gayi! Update dekho..."
                value={bcBody}
                onChange={e => setBcBody(e.target.value)}
                maxLength={200}
                rows={3}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'right', marginTop: '3px' }}>{bcBody.length}/200</div>
            </div>

            {/* Preview */}
            {(bcTitle || bcBody) && (
              <div style={{ background: '#0F172A', borderRadius: '12px', padding: '14px', color: 'white' }}>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>Preview (how it looks on Android)</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <img src="/pwa-192x192.png" alt="icon" style={{ width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>{bcTitle || 'Notification Title'}</div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>{bcBody || 'Message body...'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={sendBroadcast}
              disabled={bcSending || !bcTitle.trim() || !bcBody.trim()}
              style={{ padding: '14px', borderRadius: '12px', border: 'none', cursor: bcSending ? 'not-allowed' : 'pointer', background: (bcSending || !bcTitle.trim() || !bcBody.trim()) ? '#CBD5E1' : 'linear-gradient(135deg, #1E3A8A, #2563EB)', color: 'white', fontSize: '15px', fontWeight: '800', transition: 'all 0.2s' }}
            >
              {bcSending ? '⏳ Sending...' : '📣 Send to All'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ City Partners Tab ═══ */}
      {activeTab === 'cityPartners' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🏙️ City Partners ({cityPartners.length})</h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Click a partner to view full details</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={fetchCityPartners} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
              <button onClick={() => setCpFormOpen(!cpFormOpen)} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: 'none', background: cpFormOpen ? '#FEE2E2' : 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: cpFormOpen ? '#DC2626' : '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {cpFormOpen ? '✕ Close' : '+ Add Partner'}
              </button>
            </div>
          </div>

          {/* Create form */}
          {cpFormOpen && (
            <div className="card" style={{ padding: 16, marginBottom: 16, border: '1.5px solid #C7D2FE', background: '#EEF2FF' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', marginBottom: 12 }}>🆕 Create New City Partner</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'name', label: 'Full Name', ph: 'e.g. Ramesh Kumar', type: 'text' },
                  { key: 'phone', label: 'Phone Number', ph: 'e.g. 9876543210', type: 'tel' },
                  { key: 'password', label: 'Password', ph: 'Min 6 characters', type: 'password' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.ph} value={cpForm[f.key]}
                      onChange={e => setCpForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Assigned City</label>
                  <select value={cpForm.city} onChange={e => setCpForm(prev => ({ ...prev, city: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14 }}>
                    <option value="">— Select City —</option>
                    {locations.filter(l => l.isActive !== false).map(l => <option key={l._id} value={l.city}>{l.city}{l.nameHi ? ` (${l.nameHi})` : ''}</option>)}
                  </select>
                </div>
                <button onClick={createCityPartner} disabled={cpSaving}
                  style={{ padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: cpSaving ? 0.7 : 1 }}>
                  {cpSaving ? '⏳ Creating...' : '✅ Create City Partner'}
                </button>
              </div>
            </div>
          )}

          {/* Partners list */}
          {cpLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : cityPartners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏙️</div>
              <p style={{ fontWeight: 600 }}>No city partners yet</p>
              <p style={{ fontSize: 13 }}>Click "+ Add Partner" to create one</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cityPartners.map(p => {
                const isExpanded = cpExpandedId === p._id;
                const detail = cpDetails[p._id];
                const loadingDetail = cpDetailLoading === p._id;
                const s = detail?.stats;

                return (
                  <div key={p._id} className="card" style={{ overflow: 'hidden', border: isExpanded ? '1.5px solid #C7D2FE' : undefined }}>

                    {/* ── Partner summary row (always visible) ── */}
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{p.name}</div>
                          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>📱 {p.phone}</div>
                          <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#EEF2FF', color: '#4338CA', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                            📍 {p.city}
                          </div>
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>Added {new Date(p.createdAt).toLocaleDateString('en-IN')}</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 }}>
                          <button onClick={() => deleteCityPartner(p._id, p.name)}
                            style={{ padding: '5px 11px', borderRadius: 7, border: 'none', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Delete
                          </button>
                          <button
                            onClick={() => togglePartnerExpand(p._id)}
                            style={{ padding: '5px 11px', borderRadius: 7, border: '1.5px solid #C7D2FE', background: isExpanded ? '#EEF2FF' : 'white', color: '#1E3A8A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {isExpanded ? '▲ Hide' : '▼ Details'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid #EFF6FF', background: '#F8FAFF' }}>

                        {loadingDetail ? (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><div className="spinner" /></div>
                        ) : detail ? (
                          <div style={{ padding: 14 }}>

                            {/* Refresh button */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                              <button onClick={() => refreshPartnerDetails(p._id)}
                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>
                                ↻ Refresh data
                              </button>
                            </div>

                            {/* Stats mini-grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
                              {[
                                { label: 'Workers', val: s.totalLabours, sub: `${s.approvedLabours} approved`, icon: '🔧', color: '#1E3A8A' },
                                { label: 'Car Owners', val: s.totalCarOwners, sub: `${s.approvedCarOwners} approved`, icon: '🚗', color: '#16A34A' },
                                { label: 'Bookings', val: s.totalBookings, sub: `${s.pendingBookings} pending`, icon: '📋', color: '#8B5CF6' },
                                { label: 'Completed', val: s.completedBookings, sub: `${s.cancelledBookings} cancelled`, icon: '✅', color: '#F97316' },
                              ].map((st, i) => (
                                <div key={i} style={{ background: 'white', borderRadius: 10, padding: '10px 6px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
                                  <div style={{ fontSize: 18 }}>{st.icon}</div>
                                  <div style={{ fontSize: 20, fontWeight: 800, color: st.color, lineHeight: 1.2 }}>{st.val}</div>
                                  <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{st.label}</div>
                                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{st.sub}</div>
                                </div>
                              ))}
                            </div>

                            {/* Booking status bar */}
                            {s.totalBookings > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>📊 Booking Status Breakdown</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {[
                                    { label: 'Pending', val: s.pendingBookings, bg: '#FFF7ED', c: '#EA580C' },
                                    { label: 'Confirmed', val: s.confirmedBookings, bg: '#EFF6FF', c: '#2563EB' },
                                    { label: 'Completed', val: s.completedBookings, bg: '#F0FDF4', c: '#16A34A' },
                                    { label: 'Cancelled', val: s.cancelledBookings, bg: '#FEF2F2', c: '#DC2626' },
                                  ].map(b => (
                                    <div key={b.label} style={{ flex: 1, minWidth: 60, background: b.bg, borderRadius: 8, padding: '7px 4px', textAlign: 'center', border: `1px solid ${b.c}30` }}>
                                      <div style={{ fontSize: 18, fontWeight: 800, color: b.c }}>{b.val}</div>
                                      <div style={{ fontSize: 10, color: b.c, fontWeight: 600 }}>{b.label}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Pending workers */}
                            {detail.pendingWorkers?.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>⏳ Pending Workers ({s.pendingLabours})</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {detail.pendingWorkers.map(w => (
                                    <div key={w._id} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #FED7AA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{w.userId?.name || '—'}</div>
                                        <div style={{ fontSize: 11, color: '#64748B' }}>📱 {w.userId?.phone}</div>
                                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                                          {w.skills?.slice(0, 3).map(sk => <span key={sk} className="badge badge-blue" style={{ fontSize: 10 }}>{sk}</span>)}
                                        </div>
                                      </div>
                                      <span className="badge badge-orange" style={{ fontSize: 10, flexShrink: 0 }}>⏳ Pending</span>
                                    </div>
                                  ))}
                                  {s.pendingLabours > 5 && (
                                    <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', padding: '4px' }}>+ {s.pendingLabours - 5} more pending workers</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pending car owners */}
                            {detail.pendingOwners?.length > 0 && (
                              <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>⏳ Pending Car Owners ({s.pendingCarOwners})</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {detail.pendingOwners.map(o => (
                                    <div key={o._id} style={{ background: 'white', borderRadius: 8, padding: '8px 10px', border: '1px solid #FED7AA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{o.userId?.name || '—'}</div>
                                        <div style={{ fontSize: 11, color: '#64748B' }}>📱 {o.userId?.phone}</div>
                                      </div>
                                      <span className="badge badge-orange" style={{ fontSize: 10, flexShrink: 0 }}>⏳ Pending</span>
                                    </div>
                                  ))}
                                  {s.pendingCarOwners > 5 && (
                                    <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', padding: '4px' }}>+ {s.pendingCarOwners - 5} more pending owners</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Recent bookings */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>📋 Recent Bookings (last 10)</div>
                              {detail.recentBookings?.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '16px', color: '#94A3B8', fontSize: 13 }}>No bookings yet in this city</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {detail.recentBookings.map(b => {
                                    const isLabour = b.providerType === 'labour';
                                    const pd = b.providerDetails;
                                    const providerUser = pd?.userId;
                                    const stc = { pending: '#FFF7ED', confirmed: '#EFF6FF', completed: '#F0FDF4', cancelled: '#FEF2F2' };
                                    const stx = { pending: '#EA580C', confirmed: '#2563EB', completed: '#16A34A', cancelled: '#DC2626' };
                                    return (
                                      <div key={b._id} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid #E2E8F0' }}>
                                        {/* Row 1: type + status + date */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{isLabour ? '🔧 Service' : '🚗 Car Booking'}</span>
                                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: stc[b.status], color: stx[b.status] }}>{b.status}</span>
                                            <span style={{ fontSize: 10, color: '#94A3B8' }}>{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                          </div>
                                        </div>
                                        {/* Row 2: customer → provider */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                          <div style={{ flex: 1, minWidth: 100, background: '#EFF6FF', borderRadius: 8, padding: '7px 9px' }}>
                                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>👤 CUSTOMER</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: '#1E3A8A' }}>{b.userId?.name || 'Guest'}</div>
                                            <div style={{ fontSize: 11, color: '#64748B' }}>📱 {b.userId?.phone || '—'}</div>
                                          </div>
                                          <span style={{ color: '#94A3B8', fontSize: 16 }}>→</span>
                                          <div style={{ flex: 1, minWidth: 100, background: isLabour ? '#F0FDF4' : '#FFF7ED', borderRadius: 8, padding: '7px 9px' }}>
                                            <div style={{ fontSize: 9, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>{isLabour ? '🔧 WORKER' : '🚗 CAR OWNER'}</div>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: isLabour ? '#16A34A' : '#EA580C' }}>{providerUser?.name || '—'}</div>
                                            <div style={{ fontSize: 11, color: '#64748B' }}>📱 {providerUser?.phone || '—'}</div>
                                            {isLabour && pd?.skills?.length > 0 && (
                                              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 3 }}>
                                                {pd.skills.slice(0, 2).map(sk => <span key={sk} className="badge badge-blue" style={{ fontSize: 9, padding: '1px 6px' }}>{sk}</span>)}
                                              </div>
                                            )}
                                            {!isLabour && b.carId && (
                                              <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>🚙 {b.carId.carName} {b.carId.modelYear && `(${b.carId.modelYear})`}</div>
                                            )}
                                          </div>
                                        </div>
                                        {b.notes && <div style={{ marginTop: 6, fontSize: 11, color: '#64748B', fontStyle: 'italic' }}>💬 "{b.notes}"</div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ Banners Tab ═══ */}
      {activeTab === 'banners' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🖼️ Homepage Banners ({banners.length})</h3>
            <button onClick={fetchBanners} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {/* Upload form */}
          <div className="card" style={{ padding: 16, marginBottom: 16, background: '#F8FAFF', border: '1.5px solid #C7D2FE' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1E3A8A', marginBottom: 10 }}>➕ Upload New Banner</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>🖼️ Image File</label>
                <input
                  type="file" accept="image/*"
                  onChange={e => setBannerFile(e.target.files[0] || null)}
                  style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13, boxSizing: 'border-box' }}
                />
                {bannerFile && <div style={{ marginTop: 4, fontSize: 11, color: '#16A34A' }}>✅ {bannerFile.name}</div>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>🔗 Link (optional) — e.g. /services or https://...</label>
                <input
                  type="text"
                  placeholder="e.g. /services?skill=Electrician"
                  value={bannerLink}
                  onChange={e => setBannerLink(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
              <button
                onClick={uploadBanner}
                disabled={bannerUploading || !bannerFile}
                style={{ padding: '11px', borderRadius: 10, border: 'none', background: (bannerUploading || !bannerFile) ? '#CBD5E1' : 'linear-gradient(135deg,#1E3A8A,#2563EB)', color: '#fff', fontSize: 14, fontWeight: 800, cursor: (bannerUploading || !bannerFile) ? 'not-allowed' : 'pointer' }}
              >
                {bannerUploading ? '⏳ Uploading...' : '⬆️ Upload Banner'}
              </button>
            </div>
          </div>

          {/* Banner list */}
          {bannerLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : banners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
              <p style={{ fontWeight: 600 }}>No banners yet</p>
              <p style={{ fontSize: 13 }}>Upload one above to show it on the home page</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {banners.map((b, idx) => (
                <div key={b._id} className="card" style={{ overflow: 'hidden', border: b.isActive ? '1.5px solid #BBF7D0' : '1.5px solid #E2E8F0' }}>
                  <img src={b.imageUrl} alt={`Banner ${idx + 1}`} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '12px 14px' }}>
                    {/* Link row */}
                    {editLinkId === b._id ? (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={editLinkVal}
                          onChange={e => setEditLinkVal(e.target.value)}
                          placeholder="/services or https://..."
                          style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 13 }}
                        />
                        <button onClick={() => saveBannerLink(b._id)} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditLinkId(null)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#F1F5F9', color: '#374151', fontSize: 12, cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <span style={{ fontSize: 12, color: b.link ? '#2563EB' : '#94A3B8', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {b.link ? `🔗 ${b.link}` : '(no link)'}
                        </span>
                        <button onClick={() => { setEditLinkId(b._id); setEditLinkVal(b.link || ''); }} style={{ padding: '4px 10px', fontSize: 11, borderRadius: 7, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>✏️ Edit Link</button>
                      </div>
                    )}
                    {/* Controls */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: b.isActive ? '#16A34A' : '#94A3B8', background: b.isActive ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${b.isActive ? '#BBF7D0' : '#E2E8F0'}`, borderRadius: 20, padding: '3px 10px' }}>
                        {b.isActive ? '✅ Active' : '⏸ Hidden'}
                      </span>
                      <button
                        onClick={() => toggleBannerActive(b._id, !b.isActive)}
                        style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer', background: b.isActive ? '#FEF9C3' : '#DCFCE7', color: b.isActive ? '#854D0E' : '#166534', fontWeight: 600 }}
                      >
                        {b.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => deleteBanner(b._id)}
                        style={{ padding: '5px 12px', fontSize: 12, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, marginLeft: 'auto' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Videos Tab ── */}
      {activeTab === 'videos' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>🎬 Worker Videos ({adminVideos.length})</h3>
            <button
              onClick={() => {
                setVideoTabLoading(true);
                api.get('/videos/admin/all?limit=100')
                  .then(({ data }) => setAdminVideos(data.data || []))
                  .catch(() => toast.error('Failed to load videos'))
                  .finally(() => setVideoTabLoading(false));
              }}
              style={{ fontSize: '12px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: '700', cursor: 'pointer' }}
            >
              🔄 Refresh
            </button>
          </div>

          {videoTabLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : adminVideos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
              <div style={{ fontSize: '40px' }}>🎬</div>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>No videos uploaded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adminVideos.map(v => (
                <div key={v._id} className="card" style={{ padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  {/* Thumbnail */}
                  <img
                    src={`https://img.youtube.com/vi/${v.videoId}/mqdefault.jpg`}
                    alt="thumb"
                    style={{ width: '110px', height: '62px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.title || 'Untitled'}
                    </p>
                    {/* Uploader info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      {v.userId?.avatar
                        ? <img src={v.userId.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: '800', flexShrink: 0 }}>{v.userId?.name?.[0]?.toUpperCase()}</div>
                      }
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E3A8A' }}>{v.userId?.name || '—'}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>
                          {v.uploaderType === 'labour' ? '👷 Worker' : '🚗 Car Owner'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>
                          📱 {v.userId?.phone}
                        </span>
                      </div>
                    </div>
                    {/* Skills (labour) */}
                    {v.profile?.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        {v.profile.skills.slice(0, 3).map(s => <span key={s} className="badge badge-blue" style={{ fontSize: '10px' }}>{s}</span>)}
                      </div>
                    )}
                    {/* City */}
                    {v.profile?.city && <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 3px' }}>🏙️ {v.profile.city}</p>}
                    {/* Date */}
                    <p style={{ fontSize: '10px', color: '#94A3B8', margin: '0 0 6px' }}>
                      {new Date(v.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={v.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#EFF6FF', color: '#1E3A8A', fontWeight: '700', textDecoration: 'none' }}
                      >
                        ▶ Watch
                      </a>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete "${v.title || 'this video'}" by ${v.userId?.name}?`)) return;
                          try {
                            await api.delete(`/videos/${v._id}`);
                            setAdminVideos(prev => prev.filter(x => x._id !== v._id));
                            toast.success('Video deleted');
                          } catch {
                            toast.error('Failed to delete');
                          }
                        }}
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Locations Tab */}
      {activeTab === 'locations' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800' }}>📍 Service Areas & Hubs</h3>
            <span style={{ fontSize: '11px', background: '#F0FDF4', color: '#16A34A', padding: '4px 10px', borderRadius: '20px', fontWeight: '700', border: '1px solid #BBF7D0' }}>{locations.length} ACTIVE CITIES</span>
          </div>
          


          {/* Add/Edit Form */}
          <div className="card" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(to bottom right, #FFFFFF, #F8FAFC)', border: '1.5px solid #E2E8F0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '16px', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {locEditId ? '✏️ EDIT SERVICE HUB' : '➕ REGISTER NEW SERVICE HUB'}
            </h4>
            <form onSubmit={saveLocation} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>CITY NAME (ENGLISH) *</label>
                  <input type="text" className="input-field" placeholder="e.g. Prayagraj" value={locForm.city} onChange={e => setLocForm({...locForm, city: e.target.value})} required />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>HINDI NAME (नवरोज़ाबाद)</label>
                  <input type="text" className="input-field" placeholder="e.g. प्रयागराज" value={locForm.nameHi} onChange={e => setLocForm({...locForm, nameHi: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>PINCODE (OPTIONAL)</label>
                    <input type="text" className="input-field" placeholder="e.g. 484555" value={locForm.pincode} onChange={e => setLocForm({...locForm, pincode: e.target.value})} />
                </div>
                <div>
                    {/* Placeholder for future specific field or just empty to keep layout */}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', display: 'block', marginBottom: '6px' }}>SUB-AREAS / WARDS (COMMA SEPARATED)</label>
                <textarea className="input-field" style={{ minHeight: '60px', padding: '12px' }} placeholder="Civil Lines, Katra, Mumfordganj..." value={locForm.areas} onChange={e => setLocForm({...locForm, areas: e.target.value})} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>ENABLED SERVICES (EMPTY = ALL)</label>
                    <button type="button" onClick={() => setLocForm({ ...locForm, enabledServices: [] })} style={{ fontSize: '10px', background: 'none', border: '1px solid #CBD5E1', borderRadius: '4px', cursor: 'pointer', padding: '2px 6px' }}>Clear Filter</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '12px', border: '1.5px solid #E2E8F0', borderRadius: '12px', background: '#F8FAFC' }}>
                    {ALL_SERVICES.map(svc => {
                      const enabled = locForm.enabledServices.length === 0 || locForm.enabledServices.includes(svc);
                      return (
                        <button key={svc} type="button" onClick={() => {
                            let curr = [...locForm.enabledServices];
                            if (curr.length === 0) curr = [...ALL_SERVICES]; // if it was "all", prepopulate and remove clicked
                            
                            if (curr.includes(svc)) {
                                curr = curr.filter(s => s !== svc);
                            } else {
                                curr.push(svc);
                            }
                            if (curr.length === ALL_SERVICES.length) curr = []; // Reset to empty if all selected
                            setLocForm({...locForm, enabledServices: curr});
                        }} style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', border: `1.5px solid ${enabled ? '#1E3A8A' : '#CBD5E1'}`, background: enabled ? '#1E3A8A' : 'white', color: enabled ? 'white' : '#64748B', cursor: 'pointer', transition: 'all 0.2s' }}>
                            {svc}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#F1F5F9', padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>STATUS:</span>
                <label className="toggle">
                  <input type="checkbox" checked={locForm.isActive} onChange={e => setLocForm({...locForm, isActive: e.target.checked})} />
                  <span className="toggle-slider" />
                </label>
                <span style={{ fontSize: '11px', fontWeight: '800', color: locForm.isActive ? '#16A34A' : '#EF4444' }}>{locForm.isActive ? '✅ ACTIVE' : '⛔ OFFLINE'}</span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button type="submit" className="btn-primary" disabled={locSaving} style={{ flex: 2, padding: '14px', fontSize: '14px' }}>
                  {locSaving ? 'PROCESSING...' : locEditId ? 'UPDATE CITY' : 'ADD CITY'}
                </button>
                {locEditId && <button type="button" onClick={() => { setLocEditId(null); setLocForm({ city:'', nameHi:'', pincode:'', areas:'', isActive:true, enabledServices:[] }); }} className="btn-outline" style={{ flex: 1 }}>CANCEL</button>}
              </div>
            </form>
          </div>

          {/* List */}
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#64748B' }}>📜 REGISTERED HUBS</h4>
            <button onClick={fetchLocations} style={{ fontSize: '11px', background: 'none', border: 'none', color: '#1E3A8A', fontWeight: '700', cursor: 'pointer' }}>REFRESH LIST 🔄</button>
          </div>
          {locLoading ? <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {locations.length === 0 ? <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '20px', color: '#64748B', border: '1.5px dashed #E2E8F0' }}>No hubs found. Add your first service city above!</div> : locations.map(loc => (
                <div key={loc._id} className="card" style={{ padding: '0', overflow: 'hidden', border: loc.isActive ? '1px solid #E2E8F0' : '1px solid #FECACA' }}>
                  <div style={{ background: loc.isActive ? '#F8FAFC' : '#FEF2F2', padding: '12px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🏙️</span>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: '#1E3A8A' }}>
                          {loc.city} <span style={{ fontWeight: '400', fontSize: '13px', color: '#64748B', marginLeft: '6px' }}>({loc.nameHi || 'N/A'})</span>
                        </div>
                        {!loc.isActive && <span style={{ fontSize: '9px', background: '#DC2626', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>OFFLINE</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                       <button onClick={() => editLocation(loc)} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', border: 'none', background: 'white', color: '#1E3A8A', fontWeight: '800', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>EDIT</button>
                       <button onClick={() => deleteLocation(loc._id)} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', border: 'none', background: '#FEF2F2', color: '#DC2626', fontWeight: '800', cursor: 'pointer' }}>✕</button>
                    </div>
                  </div>
                  <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                     <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', marginBottom: '4px' }}>COVERAGE AREA</div>
                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>📡 {loc.serviceRadius || 10} KM Radius</div>
                        {loc.pincode && <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>📮 PO: {loc.pincode}</div>}
                     </div>
                     <div>
                        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700', marginBottom: '6px' }}>AREAS — click to toggle ON/OFF</div>
                        {(loc.areas || []).length === 0 ? (
                          <p style={{ fontSize: '11px', color: '#CBD5E1', fontStyle: 'italic' }}>No areas added yet</p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                            {loc.areas.map(a => {
                              const name = typeof a === 'string' ? a : a.name;
                              const active = typeof a === 'string' ? true : a.isActive !== false;
                              return (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: active ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${active ? '#BBF7D0' : '#FECACA'}`, borderRadius: '8px', padding: '3px 8px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: '700', color: active ? '#16A34A' : '#DC2626' }}>{name}</span>
                                  <button
                                    onClick={() => toggleArea(loc._id, name)}
                                    title={active ? 'Click to disable' : 'Click to enable'}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: '0 2px', color: active ? '#16A34A' : '#DC2626', fontWeight: '800' }}
                                  >{active ? '●' : '○'}</button>
                                  <button
                                    onClick={() => deleteArea(loc._id, name)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#94A3B8', padding: '0', lineHeight: 1 }}
                                    title="Remove area"
                                  >✕</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Add new area input */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <input
                            type="text"
                            placeholder="Add new area..."
                            value={areaInputs[loc._id] || ''}
                            onChange={e => setAreaInputs(prev => ({ ...prev, [loc._id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addArea(loc._id); } }}
                            style={{ flex: 1, padding: '5px 10px', fontSize: '12px', border: '1.5px solid #E2E8F0', borderRadius: '8px', outline: 'none' }}
                          />
                          <button
                            onClick={() => addArea(loc._id)}
                            disabled={areaSaving === loc._id}
                            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: '800', background: '#1E3A8A', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', opacity: areaSaving === loc._id ? 0.6 : 1 }}
                          >
                            {areaSaving === loc._id ? '...' : '+ Add'}
                          </button>
                        </div>
                     </div>
                  </div>
                  <div style={{ padding: '0 16px 16px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                     <div style={{ fontSize: '10px', fontWeight: '800', width: '100%', color: '#94A3B8', marginBottom: '2px' }}>SERVICES:</div>
                     {(!loc.enabledServices || loc.enabledServices.length === 0) ? (
                        <span style={{ fontSize: '10px', background: '#DCFCE7', color: '#16A34A', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>ALL SERVICES ENABLED</span>
                     ) : (
                        loc.enabledServices.map(s => <span key={s} style={{ fontSize: '10px', background: '#F1F5F9', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>{s}</span>)
                     )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos Tab */}
      {activeTab === 'videos' && (
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>🎬 Video Reels ({adminVideos.length})</h3>
          {videoTabLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" /></div>
          ) : adminVideos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No videos found</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '10px' }}>
              {adminVideos.map(v => (
                <div key={v._id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#000', position: 'relative' }}>
                    <video src={v.videoUrl} preload="metadata" style={{ width: '100%', height: '220px', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>
                      👁️ {v.views}
                    </div>
                  </div>
                  <div style={{ padding: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700' }}>{v.workerId?.userId?.name || 'Worker'}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{v.serviceCategory}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subs' && (
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>💳 Subscriptions</h3>
          {subsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : subs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>No subscriptions found</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {subs.map(s => (
                <div key={s._id} className="card" style={{ padding: '16px', borderLeft: `4px solid ${s.status === 'active' ? '#16A34A' : s.status === 'trial' ? '#3B82F6' : '#EF4444'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{s.userId?.name || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>📱 {s.userId?.phone} • {s.providerType === 'labour' ? 'Worker' : 'Car Owner'}</div>
                    </div>
                    <span className="badge" style={{ background: s.status === 'active' ? '#DCFCE7' : s.status === 'trial' ? '#EFF6FF' : '#FEF2F2', color: s.status === 'active' ? '#16A34A' : s.status === 'trial' ? '#3B82F6' : '#DC2626' }}>
                      {s.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '8px' }}>
                    <div>Plan: <strong>{s.plan}</strong></div>
                    {s.status === 'trial' && <div>Trial Ends: <strong>{new Date(s.trialEndsAt).toLocaleDateString('en-IN')}</strong></div>}
                    {s.status === 'active' && <div>Active Until: <strong>{new Date(s.currentPeriodEnd).toLocaleDateString('en-IN')}</strong></div>}
                  </div>
                  
                  {/* Admin Context Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    {s.status === 'trial' && (
                      <button onClick={() => {
                        const days = window.prompt("Extend trial by how many days?", "30");
                        if (days && !isNaN(days)) {
                          const newDate = new Date(s.trialEndsAt);
                          newDate.setDate(newDate.getDate() + parseInt(days));
                          handleSubOverride(s._id, { status: 'trial', trialEndsAt: newDate });
                        }
                      }} style={{ flex: 1, padding: '8px', background: '#F1F5F9', border: '1.5px solid #E2E8F0', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#3B82F6', cursor: 'pointer' }}>
                        Extend Trial
                      </button>
                    )}
                    {(s.status === 'expired' || s.status === 'cancelled') && (
                      <button onClick={() => {
                        const days = window.prompt("Activate subscription manually for how many days?", "30");
                        if (days && !isNaN(days)) {
                          const newDate = new Date();
                          newDate.setDate(newDate.getDate() + parseInt(days));
                          handleSubOverride(s._id, { status: 'active', currentPeriodEnd: newDate });
                        }
                      }} style={{ flex: 1, padding: '8px', background: '#DCFCE7', border: '1.5px solid #BBF7D0', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#16A34A', cursor: 'pointer' }}>
                        Activate Manually
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Address Viewer Modal for User */}
      {addrModalUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '440px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #F1F5F9', position: 'sticky', top: 0, background: 'white', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800' }}>📍 Addresses: {addrModalUser.name}</h3>
              <button onClick={() => setAddrModalUser(null)} style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            <div style={{ padding: '20px' }}>
              {!addrModalUser.savedAddresses?.length ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>📭 No saved addresses</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {addrModalUser.savedAddresses.map((addr, i) => (
                    <div key={addr._id || i} style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#1E3A8A', marginBottom: '4px' }}>{addr.label || 'Address'}</div>
                      <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{addr.address}</div>
                      {addr.location?.coordinates && (
                        <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>
                          📍 {addr.location.coordinates[1]?.toFixed(5)}, {addr.location.coordinates[0]?.toFixed(5)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
