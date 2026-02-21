import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#F97316', confirmed: '#3B82F6', completed: '#16A34A', cancelled: '#EF4444' };

export default function LabourDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const skillOptions = ['Plumber', 'Electrician', 'Carpenter', 'Painter', 'Mason', 'Welder', 'Driver', 'Cleaner', 'Cook', 'Security Guard', 'Gardener', 'AC Technician'];

  useEffect(() => { fetchProfile(); fetchBookings(); }, []);

  // Auto-refresh bookings every 15 seconds for real-time feel
  useEffect(() => {
    if (activeTab !== 'bookings') return;
    fetchBookings();
    const interval = setInterval(fetchBookings, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/labours/my');
      setProfile(data);
      setEditForm({ skills: data.skills, experience: data.experience, charges: data.charges, description: data.description, city: data.userId?.city || '' });
    } catch { toast.error('Failed to load profile'); }
    finally { setLoading(false); }
  };

  const fetchBookings = async () => {
    try {
      const { data } = await api.get('/booking/provider');
      setBookings(data);
    } catch {}
  };

  const toggleAvailability = async () => {
    try {
      const { data } = await api.patch(`/labour/${profile._id}`, { availability: !profile.availability });
      setProfile(data);
      toast.success(data.availability ? '✅ You are now Available' : '⏸️ You are now Unavailable');
    } catch { toast.error('Failed to update'); }
  };

  const saveProfile = async () => {
    try {
      const { data } = await api.patch(`/labour/${profile._id}`, editForm);
      setProfile(data);
      setEditing(false);
      toast.success('Profile updated! ✅');
    } catch { toast.error('Failed to update profile'); }
  };

  const toggleSkill = (skill) => {
    setEditForm(prev => ({
      ...prev,
      skills: prev.skills?.includes(skill) ? prev.skills.filter(s => s !== skill) : [...(prev.skills || []), skill],
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post(`/labour/${profile._id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(data);
      toast.success('📸 Profile photo updated!');
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); }
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="spinner" /></div>;

  return (
    <div className="page-container" style={{ paddingBottom: '24px' }}>
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>🔧 Service Provider Dashboard</div>
          <div style={{ fontSize: '12px', opacity: 0.8 }}>{user?.name}</div>
        </div>
        <button onClick={() => { logout(); navigate('/'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Logout</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0' }}>
        {[{ key: 'dashboard', label: '📊 Dashboard' }, { key: 'profile', label: '👤 Profile' }, { key: 'bookings', label: '📋 Bookings' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flex: 1, padding: '14px 8px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: activeTab === tab.key ? '#1E3A8A' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent' }}>{tab.label}</button>
        ))}
      </div>

      {/* Approval Banner */}
      {profile && !profile.isApproved && (
        <div style={{ margin: '16px', padding: '14px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>⏳</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#EA580C' }}>Pending Approval</div>
            <div style={{ fontSize: '12px', color: '#9A3412' }}>Your profile is under review. You'll be visible after admin approval.</div>
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Total Bookings', value: profile?.bookingCount || 0, icon: '📋', color: '#1E3A8A' },
              { label: 'Total Leads', value: profile?.leadCount || 0, icon: '📞', color: '#F97316' },
              { label: 'Rating', value: `${profile?.rating || 0}/5`, icon: '⭐', color: '#F59E0B' },
              { label: 'Reviews', value: profile?.reviewCount || 0, icon: '💬', color: '#16A34A' },
            ].map((stat, i) => (
              <div key={i} className="stat-card">
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{stat.icon}</div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '500' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Availability Toggle */}
          <div className="card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>Availability</div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>{profile?.availability ? '✅ Currently Available' : '⏸️ Not Available'}</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={profile?.availability || false} onChange={toggleAvailability} />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Profile Summary */}
          <div className="card" style={{ padding: '20px', marginTop: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>Profile Summary</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {profile?.skills?.map(skill => <span key={skill} className="badge badge-blue">{skill}</span>)}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>
              <div>💰 Charges: <strong>{profile?.charges || 'Not set'}</strong></div>
              <div>🏙️ City: <strong>{profile?.userId?.city || user?.city}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div style={{ padding: '16px' }}>
          {!editing ? (
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {/* Profile Image */}
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
                  {profile?.profileImage ? (
                    <img src={profile.profileImage} alt="Profile" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #E2E8F0' }} />
                  ) : (
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'white', fontWeight: '700' }}>
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{ position: 'absolute', bottom: '0', right: '-4px', background: '#1E3A8A', border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}
                  >📷</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                {uploading && <p style={{ fontSize: '12px', color: '#3B82F6' }}>⏳ Uploading...</p>}
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>{user?.name}</h2>
                <p style={{ color: '#64748B', fontSize: '14px' }}>📱 {user?.phone}</p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {profile?.skills?.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
              </div>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.8' }}>
                <div>💼 Experience: <strong>{profile?.experience} years</strong></div>
                <div>💰 Charges: <strong>{profile?.charges}</strong></div>
                <div>🏙️ City: <strong>{profile?.userId?.city}</strong></div>
                <div>⭐ Rating: <strong>{profile?.rating || 0}/5</strong> ({profile?.reviewCount || 0} reviews)</div>
                {profile?.description && <div style={{ marginTop: '8px', color: '#64748B' }}>{profile.description}</div>}
              </div>
              <button className="btn-primary" onClick={() => setEditing(true)} style={{ width: '100%', marginTop: '16px', padding: '12px' }}>✏️ Edit Profile</button>
            </div>
          ) : (
            <div className="card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px' }}>Edit Profile</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Skills</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {skillOptions.map(skill => (
                      <button key={skill} type="button" onClick={() => toggleSkill(skill)} style={{ padding: '5px 10px', borderRadius: '16px', fontSize: '12px', fontWeight: '500', border: `1.5px solid ${editForm.skills?.includes(skill) ? '#1E3A8A' : '#E2E8F0'}`, background: editForm.skills?.includes(skill) ? '#1E3A8A' : 'white', color: editForm.skills?.includes(skill) ? 'white' : '#374151', cursor: 'pointer' }}>{skill}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Experience (yrs)</label>
                    <input className="input-field" type="number" value={editForm.experience} onChange={e => setEditForm({ ...editForm, experience: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Charges</label>
                    <input className="input-field" value={editForm.charges} onChange={e => setEditForm({ ...editForm, charges: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '5px' }}>Description</label>
                  <textarea className="input-field" rows={3} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ resize: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-primary" onClick={saveProfile} style={{ flex: 1, padding: '12px' }}>💾 Save</button>
                  <button className="btn-outline" onClick={() => setEditing(false)} style={{ flex: 1, padding: '12px' }}>Cancel</button>
                </div>
              </div>
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

                  {/* Status Action Buttons */}
                  {b.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => updateBookingStatus(b._id, 'confirmed')} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>✅ Confirm</button>
                      <button onClick={() => updateBookingStatus(b._id, 'cancelled')} className="btn-danger" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>❌ Cancel</button>
                    </div>
                  )}
                  {b.status === 'confirmed' && (
                    <button onClick={() => updateBookingStatus(b._id, 'completed')} className="btn-success" style={{ width: '100%', padding: '8px', fontSize: '13px', marginTop: '8px' }}>
                      🎉 Mark as Completed
                    </button>
                  )}

                  {/* Customer Review */}
                  {b.review?.rating && (
                    <div style={{ marginTop: '10px', padding: '10px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#16A34A', marginBottom: '4px' }}>
                        {'⭐'.repeat(b.review.rating)} Customer Review
                      </div>
                      {b.review.comment && <p style={{ fontSize: '12px', color: '#64748B' }}>{b.review.comment}</p>}
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
