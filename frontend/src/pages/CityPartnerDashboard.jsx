import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA' },
  confirmed: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  completed: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  cancelled: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
};

const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'workers', label: '🔧 Workers' },
  { key: 'carowners', label: '🚗 Car Owners' },
  { key: 'bookings', label: '📋 Bookings' },
];

export default function CityPartnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [workerMeta, setWorkerMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [carOwners, setCarOwners] = useState([]);
  const [carMeta, setCarMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [bookings, setBookings] = useState([]);
  const [bookingMeta, setBookingMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [bookingFilter, setBookingFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'workers') fetchWorkers();
    if (activeTab === 'carowners') fetchCarOwners();
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/citypartner/stats');
      setStats(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load stats');
    } finally { setLoading(false); }
  };

  const fetchWorkers = async (page = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const { data } = await api.get('/citypartner/labours', { params: { page, limit: 20 } });
      setWorkers(prev => append ? [...prev, ...data.data] : data.data);
      setWorkerMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workers');
    } finally { setLoading(false); }
  };

  const fetchCarOwners = async (page = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const { data } = await api.get('/citypartner/carowners', { params: { page, limit: 20 } });
      setCarOwners(prev => append ? [...prev, ...data.data] : data.data);
      setCarMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load car owners');
    } finally { setLoading(false); }
  };

  const fetchBookings = async (page = 1, append = false) => {
    if (!append) setLoading(true);
    try {
      const { data } = await api.get('/citypartner/bookings', { params: { page, limit: 20 } });
      setBookings(prev => append ? [...prev, ...data.data] : data.data);
      setBookingMeta({ page: data.page, pages: data.pages, total: data.total });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load bookings');
    } finally { setLoading(false); }
  };

  const approveWorker = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setActionLoading(id);
    try {
      await api.patch(`/citypartner/approve-labour/${id}`, { isApproved: newStatus });
      toast.success(newStatus ? '✅ Worker approved!' : '❌ Worker unapproved');
      setWorkers(prev => prev.map(w => w._id === id ? { ...w, isApproved: newStatus } : w));
      if (stats) setStats(s => ({ ...s, pendingLabours: s.pendingLabours + (newStatus ? -1 : 1) }));
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  const approveCarOwner = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    setActionLoading(id);
    try {
      await api.patch(`/citypartner/approve-carowner/${id}`, { isApproved: newStatus });
      toast.success(newStatus ? '✅ Car owner approved!' : '❌ Car owner unapproved');
      setCarOwners(prev => prev.map(o => o._id === id ? { ...o, isApproved: newStatus } : o));
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  const suspendUser = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    if (!window.confirm(newStatus ? '⚠️ Suspend this user? They will not be able to login.' : 'Unsuspend this user?')) return;
    setActionLoading(userId);
    try {
      await api.patch(`/citypartner/suspend-user/${userId}`, { isSuspended: newStatus });
      toast.success(newStatus ? '🚫 User suspended' : '✅ User unsuspended');
      setWorkers(prev => prev.map(w =>
        w.userId?._id === userId ? { ...w, userId: { ...w.userId, isSuspended: newStatus } } : w
      ));
      setCarOwners(prev => prev.map(o =>
        o.userId?._id === userId ? { ...o, userId: { ...o.userId, isSuspended: newStatus } } : o
      ));
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(''); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const filteredBookings = bookingFilter
    ? bookings.filter(b => b.status === bookingFilter)
    : bookings;

  return (
    <div className="page-container" style={{ paddingBottom: 24 }}>

      {/* ── Header ── */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>🏙️ City Partner</div>
          <div style={{ fontSize: 12, color: '#4338CA', fontWeight: 700, marginTop: 1 }}>
            📍 {user?.city || '—'} &nbsp;·&nbsp; <span style={{ color: '#64748b', fontWeight: 500 }}>{user?.name}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ background: '#FEE2E2', border: '1.5px solid #FECACA', color: '#DC2626', padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
        >
          Logout
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #E2E8F0', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flexShrink: 0, padding: '12px 14px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
              color: activeTab === tab.key ? '#1E3A8A' : '#64748B',
              borderBottom: activeTab === tab.key ? '3px solid #1E3A8A' : '3px solid transparent',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* ══════════════════ OVERVIEW TAB ══════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : stats ? (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Workers', value: stats.labours, icon: '🔧', color: '#1E3A8A' },
                  { label: 'Car Owners', value: stats.carOwners, icon: '🚗', color: '#16A34A' },
                  { label: 'Cars', value: stats.cars, icon: '🚙', color: '#8B5CF6' },
                  { label: 'Pending Workers', value: stats.pendingLabours, icon: '⏳', color: '#F97316' },
                  { label: 'Pending Owners', value: stats.pendingCarOwners, icon: '⏳', color: '#EA580C' },
                  { label: 'Your City', value: '—', icon: '📍', color: '#4338CA', text: stats.city },
                ].map((s, i) => (
                  <div key={i} className="stat-card" style={{ padding: '14px 8px' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: s.text ? 13 : 22, fontWeight: 800, color: s.color, wordBreak: 'break-word' }}>
                      {s.text || s.value}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Pending approval alert */}
              {(stats.pendingLabours + stats.pendingCarOwners) > 0 && (
                <div className="card" style={{ padding: 16, marginBottom: 16, border: '1.5px solid #FED7AA', background: '#FFFBEB' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', marginBottom: 10 }}>
                    ⚠️ {stats.pendingLabours + stats.pendingCarOwners} pending approval{(stats.pendingLabours + stats.pendingCarOwners) > 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {stats.pendingLabours > 0 && (
                      <button onClick={() => setActiveTab('workers')} className="btn-primary" style={{ flex: 1, padding: '9px', fontSize: 13 }}>
                        👷 {stats.pendingLabours} Worker{stats.pendingLabours > 1 ? 's' : ''}
                      </button>
                    )}
                    {stats.pendingCarOwners > 0 && (
                      <button onClick={() => setActiveTab('carowners')} style={{ flex: 1, padding: '9px', fontSize: 13, background: 'linear-gradient(135deg,#16A34A,#22C55E)', border: 'none', color: '#fff', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                        🚗 {stats.pendingCarOwners} Owner{stats.pendingCarOwners > 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Permissions card */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>
                  🔐 Your Permissions
                </div>
                {[
                  { icon: '✅', text: `Approve / reject workers in ${stats.city}` },
                  { icon: '✅', text: `Approve / reject car owners in ${stats.city}` },
                  { icon: '🚫', text: `Suspend users in ${stats.city}` },
                  { icon: '📋', text: `View all bookings in ${stats.city}` },
                  { icon: '🔒', text: 'Cannot access other cities' },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 4 ? '1px solid #F1F5F9' : 'none', fontSize: 13, color: '#374151' }}>
                    <span>{p.icon}</span> {p.text}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ══════════════════ WORKERS TAB ══════════════════ */}
      {activeTab === 'workers' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>🔧 Workers in {user?.city} ({workerMeta.total})</h3>
            <button onClick={() => fetchWorkers()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : workers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔧</div>
              <p style={{ fontWeight: 600 }}>No workers registered in {user?.city} yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {workers.map(w => (
                <div key={w._id} className="card" style={{ padding: 14 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{w.userId?.name || '—'}</div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>📱 {w.userId?.phone}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>🏙️ {w.city}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <span className={`badge ${w.isApproved ? 'badge-green' : 'badge-orange'}`}>
                        {w.isApproved ? '✅ Approved' : '⏳ Pending'}
                      </span>
                      {w.userId?.isSuspended && (
                        <span className="badge badge-red">🚫 Suspended</span>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  {w.skills?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {w.skills.slice(0, 5).map(s => (
                        <span key={s} className="badge badge-blue" style={{ fontSize: 11 }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {w.charges && (
                    <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>💰 {w.charges}</div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className={w.isApproved ? 'btn-danger' : 'btn-success'}
                      onClick={() => approveWorker(w._id, w.isApproved)}
                      disabled={actionLoading === w._id}
                      style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 13 }}
                    >
                      {actionLoading === w._id ? '⏳' : w.isApproved ? '❌ Unapprove' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => suspendUser(w.userId?._id, w.userId?.isSuspended)}
                      disabled={actionLoading === w.userId?._id || !w.userId?._id}
                      style={{
                        flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: w.userId?.isSuspended ? '#F0FDF4' : '#FEF2F2',
                        color: w.userId?.isSuspended ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {actionLoading === w.userId?._id ? '⏳' : w.userId?.isSuspended ? '✅ Unsuspend' : '🚫 Suspend'}
                    </button>
                  </div>
                </div>
              ))}

              {workerMeta.page < workerMeta.pages && (
                <button onClick={() => fetchWorkers(workerMeta.page + 1, true)} className="btn-outline" style={{ width: '100%', padding: 12, fontSize: 14 }}>
                  Load more ({workers.length} of {workerMeta.total})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ CAR OWNERS TAB ══════════════════ */}
      {activeTab === 'carowners' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>🚗 Car Owners in {user?.city} ({carMeta.total})</h3>
            <button onClick={() => fetchCarOwners()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : carOwners.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🚗</div>
              <p style={{ fontWeight: 600 }}>No car owners registered in {user?.city} yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {carOwners.map(o => (
                <div key={o._id} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>{o.userId?.name || '—'}</div>
                      <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>📱 {o.userId?.phone}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>🏙️ {o.city}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <span className={`badge ${o.isApproved ? 'badge-green' : 'badge-orange'}`}>
                        {o.isApproved ? '✅ Approved' : '⏳ Pending'}
                      </span>
                      {o.userId?.isSuspended && (
                        <span className="badge badge-red">🚫 Suspended</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      className={o.isApproved ? 'btn-danger' : 'btn-success'}
                      onClick={() => approveCarOwner(o._id, o.isApproved)}
                      disabled={actionLoading === o._id}
                      style={{ flex: 1, justifyContent: 'center', padding: '8px', fontSize: 13 }}
                    >
                      {actionLoading === o._id ? '⏳' : o.isApproved ? '❌ Unapprove' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => suspendUser(o.userId?._id, o.userId?.isSuspended)}
                      disabled={actionLoading === o.userId?._id || !o.userId?._id}
                      style={{
                        flex: 1, padding: '8px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: o.userId?.isSuspended ? '#F0FDF4' : '#FEF2F2',
                        color: o.userId?.isSuspended ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {actionLoading === o.userId?._id ? '⏳' : o.userId?.isSuspended ? '✅ Unsuspend' : '🚫 Suspend'}
                    </button>
                  </div>
                </div>
              ))}

              {carMeta.page < carMeta.pages && (
                <button onClick={() => fetchCarOwners(carMeta.page + 1, true)} className="btn-outline" style={{ width: '100%', padding: 12, fontSize: 14 }}>
                  Load more ({carOwners.length} of {carMeta.total})
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ BOOKINGS TAB ══════════════════ */}
      {activeTab === 'bookings' && (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>📋 Bookings in {user?.city} ({bookingMeta.total})</h3>
            <button onClick={() => fetchBookings()} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 8, border: 'none', background: '#EFF6FF', color: '#1E3A8A', fontWeight: 600, cursor: 'pointer' }}>↻ Refresh</button>
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { label: 'All', value: '' },
              { label: '⏳ Pending', value: 'pending' },
              { label: '✅ Confirmed', value: 'confirmed' },
              { label: '🏁 Completed', value: 'completed' },
              { label: '✕ Cancelled', value: 'cancelled' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setBookingFilter(f.value)}
                style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                  borderColor: bookingFilter === f.value ? '#1E3A8A' : '#E2E8F0',
                  background: bookingFilter === f.value ? '#1E3A8A' : 'white',
                  color: bookingFilter === f.value ? 'white' : '#374151',
                }}
              >{f.label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><div className="spinner" /></div>
          ) : filteredBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 600 }}>
                {bookingFilter ? `No ${bookingFilter} bookings in ${user?.city}` : `No bookings yet in ${user?.city}`}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredBookings.map(b => {
                const isLabour = b.providerType === 'labour';
                const pd = b.providerDetails;
                const providerUser = pd?.userId;
                const statusStyle = STATUS_COLORS[b.status] || STATUS_COLORS.pending;

                return (
                  <div key={b._id} className="card" style={{ padding: 14 }}>
                    {/* Top row: type + status + date */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                        {isLabour ? '🔧 Service Booking' : '🚗 Car Booking'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}`,
                        }}>{b.status}</span>
                        <span style={{ fontSize: 11, color: '#94A3B8' }}>
                          {new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    {/* Customer → Provider flow */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>

                      {/* Customer box */}
                      <div style={{ flex: 1, minWidth: 120, background: '#EFF6FF', borderRadius: 10, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 3 }}>👤 CUSTOMER</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E3A8A' }}>{b.userId?.name || 'Guest'}</div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>📱 {b.userId?.phone || '—'}</div>
                        {b.userId?.city && (
                          <div style={{ fontSize: 11, color: '#94A3B8' }}>🏙️ {b.userId.city}</div>
                        )}
                      </div>

                      {/* Arrow */}
                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18, color: '#94A3B8', fontSize: 20 }}>→</div>

                      {/* Provider box */}
                      <div style={{ flex: 1, minWidth: 120, background: isLabour ? '#F0FDF4' : '#FFF7ED', borderRadius: 10, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, marginBottom: 3 }}>
                          {isLabour ? '🔧 WORKER' : '🚗 CAR OWNER'}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isLabour ? '#16A34A' : '#EA580C' }}>
                          {providerUser?.name || '—'}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>📱 {providerUser?.phone || '—'}</div>

                        {/* Labour-specific */}
                        {isLabour && pd?.skills?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5 }}>
                            {pd.skills.slice(0, 3).map(s => (
                              <span key={s} className="badge badge-blue" style={{ fontSize: 10 }}>{s}</span>
                            ))}
                          </div>
                        )}
                        {isLabour && pd?.charges && (
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>💰 {pd.charges}</div>
                        )}

                        {/* Car-specific */}
                        {!isLabour && b.carId && (
                          <div style={{ marginTop: 4 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A' }}>
                              🚙 {b.carId.carName} {b.carId.modelYear && `(${b.carId.modelYear})`}
                            </div>
                            {b.carId.basePrice && (
                              <div style={{ fontSize: 12, color: '#EA580C', fontWeight: 700 }}>
                                ₹{b.carId.basePrice} / {b.carId.priceType === 'per_km' ? 'km' : 'day'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {b.notes && (
                      <div style={{ marginTop: 8, fontSize: 12, color: '#475569', fontStyle: 'italic', padding: '6px 10px', background: '#F8FAFC', borderRadius: 8 }}>
                        💬 "{b.notes}"
                      </div>
                    )}

                    {/* Review */}
                    {b.review?.rating && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#EA580C' }}>{'⭐'.repeat(b.review.rating)}</span>
                        {b.review.comment && <span style={{ fontSize: 11, color: '#64748B', marginLeft: 6 }}>"{b.review.comment}"</span>}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load more */}
              {bookingMeta.page < bookingMeta.pages && (
                <button onClick={() => fetchBookings(bookingMeta.page + 1, true)} className="btn-outline" style={{ width: '100%', padding: 12, fontSize: 14 }}>
                  Load more ({bookings.length} of {bookingMeta.total})
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
