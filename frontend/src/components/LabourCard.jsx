import { useState } from 'react';
import ServiceProviderDrawer from './ServiceProviderDrawer';

export default function LabourCard({ labour, userId }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = labour.userId;
  const rating = labour.rating || 0;

  return (
    <>
      {/* Card — clicking anywhere opens the profile drawer */}
      <div
        className="card"
        onClick={() => setDrawerOpen(true)}
        style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
      >
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          {/* Avatar */}
          {labour.profileImage ? (
            <img src={labour.profileImage} alt={user?.name} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, color: 'white', fontWeight: '700' }}>
              {user?.name?.[0]?.toUpperCase() || '🔧'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>🏙️ {user?.city || labour.city}</div>
              </div>
              <span className={`badge ${labour.availability ? 'badge-green' : 'badge-gray'}`}>
                {labour.availability ? '✅ Available' : '⏸️ Busy'}
              </span>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
          {labour.skills?.slice(0, 4).map(skill => <span key={skill} className="badge badge-blue">{skill}</span>)}
          {labour.skills?.length > 4 && <span className="badge badge-gray">+{labour.skills.length - 4}</span>}
        </div>

        {/* Info row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', fontSize: '13px', color: '#374151' }}>
          <span>💼 {labour.experience || 0} yrs exp</span>
          {rating > 0 && <span>⭐ {rating}/5 ({labour.reviewCount || 0})</span>}
          <span>📋 {labour.bookingCount || 0} jobs</span>
        </div>

        {/* Tap hint */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>Tap to view full profile & reviews</span>
          <span style={{ fontSize: '18px', color: '#2563EB' }}>›</span>
        </div>
      </div>

      {/* Slide-in Drawer */}
      {drawerOpen && (
        <ServiceProviderDrawer
          labour={labour}
          userId={userId}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
