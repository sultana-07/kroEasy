import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import InstallPrompt from '../components/InstallPrompt';

const features = [
  { icon: '🔧', title: 'Service Providers', desc: 'Find skilled workers for any job in your city' },
  { icon: '🚗', title: 'Car Booking', desc: 'Book reliable cars with or without driver' },
  { icon: '📞', title: 'Direct Contact', desc: 'Call providers directly, no middleman' },
  { icon: '✅', title: 'Verified Profiles', desc: 'All providers are verified by our team' },
];

const benefits = [
  { icon: '🄓', text: 'Free Registration' },
  { icon: '📱', text: 'Direct Call Access' },
  { icon: '⚡', text: 'Quick Booking' },
  { icon: '🏘️', text: 'Local Trusted Providers' },
];

export default function LandingPage() {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div className="page-container" style={{ paddingBottom: '20px' }}>
      {/* Header */}
      <div className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '1px' }}>Services Made Easy</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to="/login">
            <button className="btn-outline" style={{ padding: '8px 16px', fontSize: '13px', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>Login</button>
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(160deg, #1E3A8A 0%, #2563EB 50%, #1E3A8A 100%)',
        padding: '48px 24px 56px',
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '-30px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(249,115,22,0.1)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚡</div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', lineHeight: '1.2', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            KroEasy
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '8px', fontWeight: '500' }}>
            Services Made Easy
          </p>
          <p style={{ fontSize: '14px', opacity: 0.75, marginBottom: '32px', lineHeight: '1.6' }}>
            Find trusted service providers &amp; cars<br />in your city – fast, easy, affordable
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '280px', margin: '0 auto' }}>
            {/* Browse without login */}
            <Link to="/dashboard">
              <button className="btn-secondary" style={{ width: '100%', padding: '14px', fontSize: '16px' }}>
                🔧 Find Service Providers
              </button>
            </Link>
            <Link to="/dashboard">
              <button style={{
                width: '100%', padding: '14px', fontSize: '16px',
                background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
                border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: '10px',
                color: 'white', fontWeight: '600', cursor: 'pointer',
              }}>
                🚗 Book a Car
              </button>
            </Link>
            <Link to="/register">
              <button className="btn-outline" style={{ width: '100%', padding: '14px', fontSize: '16px', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>
                ✨ Register Free
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Our Services ── */}
      <div style={{ padding: '28px 16px 8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', textAlign: 'center', marginBottom: '4px', color: '#0F172A' }}>
          Our Services
        </h2>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
          Find skilled professionals near you
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { icon: '⚡', label: 'Electrician' },
            { icon: '🔧', label: 'Plumber' },
            { icon: '🪚', label: 'Carpenter' },
            { icon: '🎨', label: 'Painter' },
            { icon: '❄️', label: 'AC Technician' },
            { icon: '🧱', label: 'Mason' },
            { icon: '🚗', label: 'Driver' },
            { icon: '🧹', label: 'Cleaner' },
            { icon: '🍳', label: 'Cook' },
            { icon: '💇', label: 'Beautician' },
            { icon: '🌿', label: 'Gardener' },
            { icon: '🛡️', label: 'Security Guard' },
          ].map(s => (
            <Link to={`/dashboard?skill=${encodeURIComponent(s.label)}`} key={s.label} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'white',
                borderRadius: '14px',
                padding: '14px 8px',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                border: '1px solid #F1F5F9',
                cursor: 'pointer',
                transition: 'transform 0.15s',
              }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onTouchStart={e => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#1E3A8A', lineHeight: '1.3' }}>{s.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* What We Offer */}
      <div style={{ padding: '24px 16px 16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', textAlign: 'center', marginBottom: '20px', color: '#0F172A' }}>
          What We Offer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{ padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E3A8A', marginBottom: '4px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div style={{ padding: '16px', margin: '8px 16px', background: 'linear-gradient(135deg, #EFF6FF, #FFF7ED)', borderRadius: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', textAlign: 'center', marginBottom: '16px', color: '#0F172A' }}>
          🎁 Free Benefits
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {benefits.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'white', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: '20px' }}>{b.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0F172A' }}>{b.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '24px 16px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Ready to get started?</h2>
        <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>Join thousands of users in your city</p>
        <Link to="/register">
          <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '17px' }}>
            🚀 Register Now – It's Free!
          </button>
        </Link>
        <p style={{ marginTop: '12px', fontSize: '13px', color: '#64748B' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1E3A8A', fontWeight: '600', textDecoration: 'none' }}>Login here</Link>
        </p>
      </div>

      {/* Provider CTA */}
      <div style={{ margin: '0 16px 24px', padding: '20px', background: '#0F172A', borderRadius: '16px', textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>💼</div>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Are you a Service Provider?</h3>
        <p style={{ fontSize: '13px', opacity: 0.7, marginBottom: '16px' }}>Register as Service Provider or Car Owner and get leads directly</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Link to="/register?role=labour">
            <button className="btn-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>🔧 Service Provider</button>
          </Link>
          <Link to="/register?role=carowner">
            <button style={{ padding: '10px 18px', fontSize: '13px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontWeight: '600', cursor: 'pointer' }}>🚗 Car Owner</button>
          </Link>
        </div>
      </div>

      <InstallPrompt />

      {/* Footer */}
      <div style={{ background: '#0F172A', color: 'white', padding: '28px 20px 20px', marginTop: '8px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '12px', opacity: 0.6 }}>Nowrozabad & Birshingpur Pali</div>
        </div>

        {/* Links Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Features */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.5, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Features</div>
            {[
              { label: '🔧 Service Providers', to: '/dashboard' },
              { label: '🚗 Car Booking', to: '/dashboard' },
              { label: '👤 Register Free', to: '/register' },
              { label: '🔒 Login', to: '/login' },
            ].map((l, i) => (
              <Link key={i} to={l.to} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', marginBottom: '8px' }}>{l.label}</Link>
            ))}
          </div>

          {/* Support & Legal */}
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', opacity: 0.5, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Support & Legal</div>
            {[
              { label: '🛠️ Help & Support', to: '/support' },
              { label: '📜 Terms & Conditions', to: '/terms' },
              { label: '🔒 Privacy Policy', to: '/privacy' },
            ].map((l, i) => (
              <Link key={i} to={l.to} style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.75)', textDecoration: 'none', marginBottom: '8px' }}>{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div style={{ padding: '14px', background: 'rgba(255,255,255,0.07)', borderRadius: '12px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', opacity: 0.6, marginBottom: '8px', textTransform: 'uppercase' }}>Contact</div>
          <a href="mailto:sultanalih8@gmail.com" style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', marginBottom: '6px' }}>📧 sultanalih8@gmail.com</a>
          <a href="https://wa.me/918878353787" style={{ display: 'block', fontSize: '13px', color: '#25D366', textDecoration: 'none', fontWeight: '600' }}>💬 WhatsApp: 8878353787</a>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', opacity: 0.5 }}>© 2025 KroEasy. Made with ❤️ for small-town India.</p>
          <p style={{ fontSize: '11px', opacity: 0.35, marginTop: '4px' }}>Nowrozabad & Birshingpur Pali, MP</p>
        </div>
      </div>
    </div>
  );
}
