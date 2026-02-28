import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState({ recentBookings: [], recentCallLogs: [] });
  const [labours, setLabours] = useState([]);
  const [labourTotal, setLabourTotal] = useState(0);
  const [carOwners, setCarOwners] = useState([]);
  const [carOwnerTotal, setCarOwnerTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [providerStats, setProviderStats] = useState({ labourStats: [], carOwnerStats: [] });
  const [activeTab, setActiveTab] = useState('overview');
  const [labourView, setLabourView] = useState('manage'); // 'manage' | 'stats'
  const [carView, setCarView] = useState('manage');       // 'manage' | 'stats'
  const [loading, setLoading] = useState(true);
  const [passwordResets, setPasswordResets] = useState([]);

  useEffect(() => { fetchAll(); }, []);

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

  const chartData = stats ? [
    { name: 'Users', value: stats.users, fill: '#1E3A8A' },
    { name: 'Providers', value: stats.labours, fill: '#F97316' },
    { name: 'Car Owners', value: stats.carOwners, fill: '#16A34A' },
    { name: 'Cars', value: stats.cars, fill: '#8B5CF6' },
    { name: 'Bookings', value: stats.bookings, fill: '#EC4899' },
    { name: 'Call Logs', value: stats.callLogs, fill: '#F59E0B' },
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
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ flexShrink: 0, padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: activeTab === tab.key ? '#1E3A8A' : '#64748B', borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent', whiteSpace: 'nowrap' }}>{tab.label}</button>
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-success" onClick={() => approveLabour(l._id, true)}
                        style={{ opacity: l.isApproved ? 1 : 0.5, fontWeight: l.isApproved ? '800' : '400' }}>✅ Approve</button>
                      <button className="btn-danger" onClick={() => approveLabour(l._id, false)}
                        style={{ opacity: !l.isApproved ? 1 : 0.5, fontWeight: !l.isApproved ? '800' : '400' }}>❌ Reject</button>
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
                      {[
                        { label: '📋 Total\nBookings', val: l.totalBookings, color: '#0F172A' },
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
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-success" onClick={() => approveCarOwner(o._id, true)}
                        style={{ opacity: o.isApproved ? 1 : 0.5, fontWeight: o.isApproved ? '800' : '400' }}>✅ Approve</button>
                      <button className="btn-danger" onClick={() => approveCarOwner(o._id, false)}
                        style={{ opacity: !o.isApproved ? 1 : 0.5, fontWeight: !o.isApproved ? '800' : '400' }}>❌ Reject</button>
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
                      {[
                        { label: '📋 Total\nBookings', val: o.totalBookings, color: '#0F172A' },
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '15px' }}>{u.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748B' }}>📱 {u.phone} • {u.role}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <span className={`badge ${u.isSuspended ? 'badge-red' : 'badge-green'}`}>{u.isSuspended ? '⛔ Suspended' : '✅ Active'}</span>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => suspendUser(u._id, !u.isSuspended)}
                          style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: u.isSuspended ? '#F0FDF4' : '#FEF2F2', color: u.isSuspended ? '#16A34A' : '#DC2626', fontWeight: '600' }}
                        >{u.isSuspended ? 'Unsuspend' : 'Suspend'}</button>
                      )}
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
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>📋 Recent Bookings (Who booked Whom)</h3>
          {activity.recentBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', marginBottom: '16px' }}>No bookings yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {activity.recentBookings.map(b => {
                const pd = b.providerDetails;
                const providerName = b.providerType === 'labour'
                  ? pd?.userId?.name
                  : (b.carId?.carName || pd?.userId?.name);
                const providerPhone = pd?.userId?.phone;
                const providerCity = pd?.userId?.city;
                const providerSkills = pd?.skills;

                return (
                  <div key={b._id} className="card" style={{ padding: '14px' }}>
                    {/* User → Provider header */}
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
                    {/* Status + Date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={`badge ${b.status === 'pending' ? 'badge-orange' : b.status === 'confirmed' ? 'badge-green' : 'badge-red'}`}>
                        {b.status}
                      </span>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                    </div>
                    {b.notes && <div style={{ marginTop: '6px', fontSize: '12px', color: '#374151', fontStyle: 'italic' }}>💬 "{b.notes}"</div>}
                  </div>
                );
              })}
            </div>
          )}

          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px' }}>📞 Recent Call Logs</h3>
          {activity.recentCallLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>No call logs yet</div>
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
    </div>
  );
}
