import { useState } from 'react';
import CarOwnerDrawer from './CarOwnerDrawer';

export default function CarCard({ car, userId }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const owner = car.ownerId?.userId;

  return (
    <>
      {/* Card — clicking anywhere opens the drawer */}
      <div
        className="card"
        onClick={() => setDrawerOpen(true)}
        style={{ padding: '16px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
      >
        {/* Car Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>🚗 {car.carName}</div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              {car.modelYear} • {owner?.name || 'Owner'} • 🏙️ {car.city || owner?.city}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E3A8A' }}>₹{car.basePrice}</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>{car.priceType === 'per_day' ? 'per day' : 'per km'}</div>
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {car.ac ? <span className="badge badge-blue">❄️ AC</span> : <span className="badge badge-gray">🌡️ Non-AC</span>}
          {car.driverIncluded ? <span className="badge badge-green">🧑‍✈️ Driver</span> : <span className="badge badge-gray">🚗 Self Drive</span>}
          <span className={`badge ${car.availability ? 'badge-green' : 'badge-red'}`}>
            {car.availability ? '✅ Available' : '❌ Unavailable'}
          </span>
        </div>

        {/* Stats + tap hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', gap: '12px' }}>
            <span>📞 {car.leadCount || 0} calls</span>
            <span>📋 {car.bookingCount || 0} bookings</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>View details</span>
            <span style={{ fontSize: '18px', color: '#2563EB' }}>›</span>
          </div>
        </div>
      </div>

      {/* Slide-in Drawer */}
      {drawerOpen && (
        <CarOwnerDrawer
          car={car}
          userId={userId}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}
