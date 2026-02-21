import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const emptyCarForm = { carName: '', numberPlate: '', modelYear: new Date().getFullYear(), priceType: 'per_day', basePrice: '', ac: false, driverIncluded: false };
const STATUS_COLORS = { pending: '#F97316', confirmed: '#3B82F6', completed: '#16A34A', cancelled: '#EF4444' };

export default function CarOwnerDashboard() {
  const { user, logout } = useAuth();
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
  const fileRef = useRef();

  useEffect(() => {
    fetchCars();
    fetchBookings();
  }, []);

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
      toast.success('📸 Profile photo updated!');
    } catch { toast.error('Image upload failed'); }
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
      if (err.response?.status !== 403) toast.error('Failed to load cars');
    } finally { setLoading(false); }
  };

  const saveCar = async () => {
    if (!carForm.carName || !carForm.basePrice) return toast.error('Car name and price are required');
    try {
      if (editingCar) {
        const { data } = await api.patch(`/car/${editingCar._id}`, carForm);
        setCars(cars.map(c => c._id === editingCar._id ? data : c));
        toast.success('Car updated! ✅');
      } else {
        const { data } = await api.post('/car', carForm);
        setCars([...cars, data]);
        toast.success('Car added! 🚗');
      }
      setShowAddForm(false);
      setEditingCar(null);
      setCarForm(emptyCarForm);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save car');
    }
  };

  const deleteCar = async (carId) => {
    if (!window.confirm('Delete this car?')) return;
    try {
      await api.delete(`/car/${carId}`);
      setCars(cars.filter(c => c._id !== carId));
      toast.success('Car deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleCarAvailability = async (car) => {
    try {
      const { data } = await api.patch(`/car/${car._id}`, { availability: !car.availability });
      setCars(cars.map(c => c._id === car._id ? data : c));
      toast.success(data.availability ? '✅ Car is now Available' : '⏸️ Car marked Unavailable');
    } catch { toast.error('Failed to update'); }
  };

  const startEdit = (car) => {
    setEditingCar(car);
    setCarForm({ carName: car.carName, numberPlate: car.numberPlate || '', modelYear: car.modelYear, priceType: car.priceType, basePrice: car.basePrice, ac: car.ac, driverIncluded: car.driverIncluded });
    setShowAddForm(true);
  };

  return (
    <div className="page-container" style={{ paddingBottom: '24px' }}>
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>🚗 Car Owner Dashboard</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user?.name}</div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
        {[{ key: 'cars', label: '🚗 My Cars' }, { key: 'bookings', label: '📋 Bookings' }, { key: 'profile', label: '👤 Profile' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '14px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activeTab === tab.key ? '#1E3A8A' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent' }}>{tab.label}</button>
        ))}
      </div>

      {/* Cars Tab */}
      {activeTab === 'cars' && (
        <div style={{ padding: '16px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Total Cars', value: cars.length, icon: '🚗' },
              { label: 'Total Leads', value: cars.reduce((a, c) => a + (c.leadCount || 0), 0), icon: '📞' },
              { label: 'Bookings', value: cars.reduce((a, c) => a + (c.bookingCount || 0), 0), icon: '📋' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ padding: '14px 10px' }}>
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{s.icon}</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Add Car Button */}
          {!showAddForm && (
            <button className="btn-primary" onClick={() => { setShowAddForm(true); setEditingCar(null); setCarForm(emptyCarForm); }} style={{ width: '100%', padding: '13px', marginBottom: '16px' }}>
              ➕ Add New Car
            </button>
          )}

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>{editingCar ? '✏️ Edit Car' : '➕ Add New Car'}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Car Name *</label>
                  <input className="input-field" placeholder="e.g. Maruti Swift" value={carForm.carName} onChange={e => setCarForm({ ...carForm, carName: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Number Plate</label>
                  <input className="input-field" placeholder="e.g. MH12AB1234" value={carForm.numberPlate} onChange={e => setCarForm({ ...carForm, numberPlate: e.target.value.toUpperCase() })} style={{ textTransform: 'uppercase', letterSpacing: '1px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Model Year</label>
                    <input className="input-field" type="number" value={carForm.modelYear} onChange={e => setCarForm({ ...carForm, modelYear: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Base Price (₹) *</label>
                    <input className="input-field" type="number" placeholder="0" value={carForm.basePrice} onChange={e => setCarForm({ ...carForm, basePrice: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Price Type</label>
                  <select className="input-field" value={carForm.priceType} onChange={e => setCarForm({ ...carForm, priceType: e.target.value })}>
                    <option value="per_day">Per Day</option>
                    <option value="per_km">Per KM</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    <input type="checkbox" checked={carForm.ac} onChange={e => setCarForm({ ...carForm, ac: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    ❄️ AC
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }}>
                    <input type="checkbox" checked={carForm.driverIncluded} onChange={e => setCarForm({ ...carForm, driverIncluded: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    🧑‍✈️ Driver Included
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={saveCar} style={{ flex: 1, padding: '12px' }}>💾 Save Car</button>
                  <button className="btn-outline" onClick={() => { setShowAddForm(false); setEditingCar(null); }} style={{ flex: 1, padding: '12px' }}>Cancel</button>
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
              <p style={{ fontWeight: '600' }}>No cars added yet</p>
              <p style={{ fontSize: '13px' }}>Add your first car to start getting bookings</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cars.map(car => (
                <div key={car._id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700' }}>🚗 {car.carName}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>{car.modelYear} • {car.priceType === 'per_day' ? 'Per Day' : 'Per KM'}</div>
                      {car.numberPlate && <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E3A8A', background: '#EFF6FF', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', letterSpacing: '1px', marginTop: '3px', border: '1px solid #BFDBFE' }}>🚘 {car.numberPlate}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#1E3A8A' }}>₹{car.basePrice}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{car.priceType === 'per_day' ? '/day' : '/km'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                    {car.ac && <span className="badge badge-blue">❄️ AC</span>}
                    {car.driverIncluded && <span className="badge badge-green">🧑‍✈️ Driver</span>}
                    <span className="badge badge-gray">📞 {car.leadCount} leads</span>
                    <span className="badge badge-gray">📋 {car.bookingCount} bookings</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="toggle">
                      <input type="checkbox" checked={car.availability} onChange={() => toggleCarAvailability(car)} />
                      <span className="toggle-slider" />
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-success" onClick={() => startEdit(car)}>✏️ Edit</button>
                      <button className="btn-danger" onClick={() => deleteCar(car._id)}>🗑️ Delete</button>
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
          {bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <p style={{ fontWeight: '600' }}>No bookings yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookings.map(b => (
                <div key={b._id} className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{b.userId?.name || 'Customer'}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {b.userId?.phone}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: (STATUS_COLORS[b.status] || '#64748B') + '20', color: STATUS_COLORS[b.status] || '#64748B' }}>
                      {b.status}
                    </span>
                  </div>
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => updateBookingStatus(b._id, 'confirmed')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>✅ Confirm</button>
                      <button onClick={() => updateBookingStatus(b._id, 'cancelled')} className="btn-danger" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>❌ Cancel</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateBookingStatus(b._id, 'completed')} className="btn-success" style={{ width: '100%', padding: '8px', fontSize: '13px', marginTop: '8px' }}>🎉 Mark as Completed</button>
                  )}
                  {b.review?.rating && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#16A34A', marginBottom: '4px' }}>{'⭐'.repeat(b.review.rating)} Customer Review</div>
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
                <img src={user.avatar} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0' }} />
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
            {avatarUploading && <p style={{ fontSize: '12px', color: '#F97316', marginBottom: '8px' }}>⏳ Uploading...</p>}
            <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{user?.name}</h2>
            <p style={{ color: '#64748B', fontSize: '14px' }}>📱 {user?.phone}</p>
            <p style={{ color: '#64748B', fontSize: '14px' }}>🏙️ {user?.city}</p>
            <span className="badge badge-orange" style={{ marginTop: '8px' }}>🚗 Car Owner</span>
          </div>
          <button onClick={() => { logout(); navigate('/'); }} className="btn-danger" style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', marginTop: '16px' }}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}
