import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { cache } from '../utils/apiCache';
import toast from 'react-hot-toast';

const emptyCarForm = { carName: '', numberPlate: '', modelYear: new Date().getFullYear(), basePrice: '', seats: '' };
const STATUS_COLORS = { pending: '#F97316', confirmed: '#3B82F6', completed: '#16A34A', cancelled: '#EF4444' };

export default function CarOwnerDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCar, setEditingCar] = useState(null);
  const [carForm, setCarForm] = useState(emptyCarForm);
  const [activeTab, setActiveTab] = useState('cars');
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileImgOpen, setProfileImgOpen] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    fetchCars();
    fetchBookings();
    fetchOwnerProfile();
  }, []);

  // Fetch the CarOwner document — this is the source of truth for isApproved.
  // (Admin approval sets CarOwner.isApproved, never User.approvalStatus.)
  const fetchOwnerProfile = async () => {
    try {
      const { data } = await api.get('/cars/owner-profile');
      setOwnerProfile(data);
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
    if (activeTab !== 'bookings') return;
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
      formData.append('image', file);
      const { data } = await api.post('/auth/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const stored = JSON.parse(localStorage.getItem('kroeasy_user') || '{}');
      localStorage.setItem('kroeasy_user', JSON.stringify({ ...stored, avatar: data.avatar }));
      refreshUser();
      toast.success('📸 प्रोफ़ाइल फ़ोटो अपडेट हुई!');
    } catch { toast.error('इमेज अपलोड विफल'); }
    finally { setAvatarUploading(false); }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/booking/provider');
      setBookings(data);
    } catch {}
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/booking/${bookingId}/status`, { status });
      toast.success(`Booking marked as ${status} ✅`);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const fetchCars = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cars/my');
      setCars(data);
    } catch (err) {
      if (err.response?.status !== 403) toast.error('कारें लोड नहीं हुईं');
    } finally { setLoading(false); }
  };

  const saveCar = async () => {
    if (!carForm.carName || !carForm.basePrice) return toast.error('कार का नाम और कीमत जरूरी है');
    try {
      if (editingCar) {
        const { data } = await api.patch(`/car/${editingCar._id}`, carForm);
        setCars(cars.map(c => c._id === editingCar._id ? data : c));
        toast.success('कार अपडेट हुई! ✅');
      } else {
        const { data } = await api.post('/car', carForm);
        setCars([...cars, data]);
        cache.bust('/cars'); // bust public listing cache so new car shows immediately
        toast.success('कार जोड़ी गई! 🚗');
      }
      setShowAddForm(false);
      setEditingCar(null);
      setCarForm(emptyCarForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save car');
    }
  };

  const deleteCar = async (carId) => {
    if (!window.confirm('इस कार को हटाएं?')) return;
    try {
      await api.delete(`/car/${carId}`);
      setCars(cars.filter(c => c._id !== carId));
      toast.success('कार हटा दी गई');
    } catch { toast.error('हटाने में विफल'); }
  };

  const toggleCarAvailability = async (car) => {
    try {
      const { data } = await api.patch(`/car/${car._id}`, { availability: !car.availability });
      setCars(cars.map(c => c._id === car._id ? data : c));
      toast.success(data.availability ? '✅ कार अभी उपलब्ध है' : '⏸️ कार अनुपलब्ध');
    } catch { toast.error('अपडेट नहीं हुआ'); }
  };

  const startEdit = (car) => {
    setEditingCar(car);
    setCarForm({ carName: car.carName, numberPlate: car.numberPlate || '', modelYear: car.modelYear, basePrice: car.basePrice, seats: car.seats || '' });
    setShowAddForm(true);
  };

  return (
    <div className="page-container" style={{ paddingBottom: '24px' }}>
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>{t('carOwnerDashboard')}</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user?.name}</div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>{t('logout')}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0', marginTop: '12px' }}>
        {[{ key: 'cars', label: t('myCars') }, { key: 'bookings', label: t('tabBookings') }, { key: 'profile', label: t('tabProfile') }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '14px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activeTab === tab.key ? '#1E3A8A' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent' }}>{tab.label}</button>
        ))}
      </div>

      {/* Cars Tab */}
      {activeTab === 'cars' && (
        <div style={{ padding: '16px' }}>
          {/* Approval Status inline banner */}
          {ownerProfile && !ownerProfile.isApproved && (() => {
            const m = {
              pending: { bg: '#FFF7ED', border: '#FED7AA', icon: '⏳', title: t('pendingApprovalTitle'), msg: 'समीक्षाधीन — अनुमोदन के बाद कार जोड़ सकते हैं।', color: '#EA580C' },
            }[ownerProfile.isApproved === false ? 'pending' : ''];
            if (!m) return null;
            return <div style={{ padding: '12px 14px', background: m.bg, border: `1px solid ${m.border}`, borderRadius: '12px', display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>{m.icon}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '700', color: m.color }}>{m.title}</div><div style={{ fontSize: '12px', color: m.color, opacity: 0.8 }}>{m.msg}</div></div>
              <button
                onClick={fetchOwnerProfile}
                style={{ background: '#F97316', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>🔄 Refresh</button>
            </div>;
          })()}
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: t('totalCars'), value: cars.length, icon: '🚗' },
              { label: t('totalLeads'), value: cars.reduce((a, c) => a + (c.leadCount || 0), 0), icon: '📞' },
              { label: t('myBookings'), value: cars.reduce((a, c) => a + (c.bookingCount || 0), 0), icon: '📋' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ padding: '14px 10px' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add Car Button — only shown to approved owners */}
          {!showAddForm && ownerProfile?.isApproved && (
            <button className="btn-primary" onClick={() => { setShowAddForm(true); setEditingCar(null); setCarForm(emptyCarForm); }} style={{ width: '100%', padding: '13px', marginBottom: '16px' }}>
              {t('addNewCar')}
            </button>
          )}
          {!showAddForm && !ownerProfile?.isApproved && (
            <div style={{ padding: '14px 16px', background: '#FFF7ED', border: '1px dashed #FED7AA', borderRadius: '12px', textAlign: 'center', marginBottom: '16px', color: '#9A3412', fontSize: '13px' }}>
              ⏳ {t('pendingApprovalText')}
            </div>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{editingCar ? t('editCar') : t('addNewCar')}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>{t('carName')} *</label>
                  <input className="input-field" placeholder="e.g. Maruti Swift" value={carForm.carName} onChange={e => setCarForm({ ...carForm, carName: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>{t('numberPlate')}</label>
                  <input className="input-field" placeholder="e.g. MH12AB1234" value={carForm.numberPlate} maxLength={10} onChange={e => setCarForm({ ...carForm, numberPlate: e.target.value.toUpperCase().slice(0, 10) })} style={{ textTransform: 'uppercase', letterSpacing: '1px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>{t('modelYear')}</label>
                    <input className="input-field" type="number" value={carForm.modelYear} onChange={e => setCarForm({ ...carForm, modelYear: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>💰 {t('perKm')} (₹) *</label>
                    <input className="input-field" type="number" placeholder="e.g. 12" value={carForm.basePrice} onChange={e => setCarForm({ ...carForm, basePrice: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>🪑 {t('seatingLabel')}</label>
                  <select className="input-field" value={carForm.seats || ''} onChange={e => setCarForm({ ...carForm, seats: e.target.value ? Number(e.target.value) : '' })}>
                    <option value="">{t('selectSeats')}</option>
                    {[4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {t('seater')}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={saveCar} style={{ flex: 1, padding: '12px' }}>{t('saveCar')}</button>
                  <button className="btn-outline" onClick={() => { setShowAddForm(false); setEditingCar(null); }} style={{ flex: 1, padding: '12px' }}>{t('cancel')}</button>
                </div>
              </div>
            </div>
          )}

          {/* Car List */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : cars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
              <p style={{ fontWeight: '600' }}>अभी कोई कार नहीं जोड़ी</p>
              <p style={{ fontSize: '13px' }}>बुकिंग शुरू करने के लिए अपनी पहली कार जोड़ें</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cars.map(car => (
                <div key={car._id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>🚗 {car.carName}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>{car.modelYear} • {t('perKm')}</div>
                      {car.numberPlate && <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', letterSpacing: '1px', marginTop: '3px', border: '1px solid #BFDBFE' }}>🚘 {car.numberPlate}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E3A8A' }}>₹{car.basePrice}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>/{t('perKm')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {car.seats ? <span className="badge badge-blue">🪑 {car.seats} {t('seater')}</span> : null}
                    {car.ac && <span className="badge badge-blue">❄️ AC</span>}
                    {car.driverIncluded && <span className="badge badge-green">🧑‍✈️ Driver</span>}
                    <span className="badge badge-gray">📞 {car.leadCount} {t('leadsLabel')}</span>
                    <span className="badge badge-gray">📋 {car.bookingCount} {t('bookingsLabel')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="toggle">
                      <input type="checkbox" checked={car.availability} onChange={() => toggleCarAvailability(car)} />
                      <span className="toggle-slider" />
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-success" onClick={() => startEdit(car)}>{t('editCar')}</button>
                      <button className="btn-danger" onClick={() => deleteCar(car._id)}>{t('deleteCar')}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div style={{ padding: '16px' }}>
          {/* Approval Status inline banner */}
          {ownerProfile && !ownerProfile.isApproved && (
            <div style={{ padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '12px', display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '20px' }}>⏳</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: '13px', fontWeight: '700', color: '#EA580C' }}>{t('pendingApprovalTitle')}</div><div style={{ fontSize: '12px', color: '#EA580C', opacity: 0.8 }}>समीक्षाधीन — अनुमोदन के बाद बुकिंग शुरू होगी।</div></div>
              <button
                onClick={fetchOwnerProfile}
                style={{ background: '#F97316', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0 }}>🔄 Refresh</button>
            </div>
          )}
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontWeight: '600' }}>{t('noBookingsText')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.map(b => (
                <div key={b._id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{b.userId?.name || 'ग्राहक'}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {b.userId?.phone}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: (STATUS_COLORS[b.status] || '#64748B') + '20', color: STATUS_COLORS[b.status] || '#64748B' }}>
                      {b.status === 'pending' ? t('statusPending') : b.status === 'confirmed' ? t('statusConfirmed') : b.status === 'completed' ? t('statusCompleted') : t('statusCancelled')}
                    </span>
                  </div>
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => updateBookingStatus(b._id, 'confirmed')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>{t('confirmBtn')}</button>
                      <button onClick={() => updateBookingStatus(b._id, 'cancelled')} className="btn-danger" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>{t('cancelBtnLabel')}</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateBookingStatus(b._id, 'completed')} className="btn-success" style={{ width: '100%', padding: '8px', fontSize: '13px', marginTop: '8px' }}>{t('markCompletedBtn')}</button>
                  )}
                  {b.review?.rating && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#16A34A', marginBottom: '4px' }}>{'⭐'.repeat(b.review.rating)} {t('customerReviewLabel')}</div>
                      {b.review.comment && <p style={{ fontSize: '12px', color: '#64748B' }}>{b.review.comment}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ padding: '24px 16px' }}>
          <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  onClick={() => setProfileImgOpen(true)}
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0', cursor: 'pointer' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #FB923C)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'white', fontWeight: '700' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                style={{ position: 'absolute', bottom: '0', right: '-4px', background: '#F97316', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
              >📷</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            {avatarUploading && <p style={{ fontSize: '12px', color: '#F97316', marginBottom: '8px' }}>⏳ {t('uploading')}</p>}
            {user?.avatar && <p style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px' }}>{t('tapPhotoToView')}</p>}
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{user?.name}</h2>
            <p style={{ color: '#64748B', fontSize: '14px' }}>📱 {user?.phone}</p>
            <p style={{ color: '#64748B', fontSize: '14px' }}>🏙️ {user?.city}</p>
            <span className="badge badge-orange" style={{ marginTop: '8px' }}>{t('carOwnerBadge')}</span>
          </div>
          {/* Approval Status Card */}
          {(() => {
            const statusMap = {
              pending:   { bg: '#FFF7ED', border: '#FED7AA', icon: '⏳', title: t('pendingApprovalTitle'), text: t('pendingApprovalText'), color: '#EA580C' },
              approved:  { bg: '#F0FDF4', border: '#BBF7D0', icon: '✅', title: t('approvedTitle'), text: t('approvedText'), color: '#16A34A' },
              rejected:  { bg: '#FEF2F2', border: '#FECACA', icon: '❌', title: t('rejectedTitle'), text: t('rejectedText'), color: '#DC2626' },
              suspended: { bg: '#FFF1F2', border: '#FECDD3', icon: '🚫', title: t('accountSuspended'), text: 'आपका खाता निलंबित कर दिया गया है। इसे हल करने के लिए सहायता से संपर्क करें।', color: '#BE123C' },
            };
            const s = statusMap[ownerProfile?.isApproved ? 'approved' : 'pending'];
            return (
              <div style={{ padding: '14px 16px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '16px', marginBottom: '4px' }}>
                <span style={{ fontSize: '26px', flexShrink: 0 }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: s.color }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: s.color, opacity: 0.8, lineHeight: '1.5', marginTop: '2px' }}>{s.text}</div>
                  {(user?.approvalStatus === 'rejected' || user?.approvalStatus === 'suspended') && (
                    <a href="https://wa.me/918878353787" style={{ fontSize: '12px', color: s.color, fontWeight: '700', marginTop: '6px', display: 'inline-block' }}>💬 {t('contactSupport')}</a>
                  )}
                </div>
                  {!ownerProfile?.isApproved && <button
                    onClick={fetchOwnerProfile}
                    style={{ background: '#F97316', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap' }}>🔄 Refresh</button>}
              </div>
            );
          })()}
          <button onClick={() => { logout(); navigate('/'); }} className="btn-danger" style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', marginTop: '16px' }}>
            🚪 {t('logout')}
          </button>
        </div>
      )}

      {/* Profile Image Full-Size Modal */}
      {profileImgOpen && user?.avatar && (
        <div
          onClick={() => setProfileImgOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <button
            onClick={() => setProfileImgOpen(false)}
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}
          >✕</button>
          <img
            src={user.avatar}
            alt="Profile"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '16px', objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.6)', border: '3px solid rgba(255,255,255,0.15)' }}
          />
        </div>
      )}
    </div>
  );
}
