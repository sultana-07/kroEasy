import { Link } from 'react-router-dom';

export default function SupportPage() {
  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px', display: 'flex', alignItems: 'center' }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg></Link>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>Help & Support</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>🛠️ Help & Support</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>We're here to help you — reach out anytime</p>

        {/* Contact Card */}
        <div style={{ padding: '20px', background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', borderRadius: '16px', color: 'white', marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>👋</div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Contact Our Support Team</h2>
          <a href="mailto:sultanalih8@gmail.com" style={{ display: 'block', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '10px', color: 'white', textDecoration: 'none', fontWeight: '600' }}>
            📧 sultanalih8@gmail.com
          </a>
          <a href="tel:8878353787" style={{ display: 'block', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '14px', marginBottom: '10px', color: 'white', textDecoration: 'none', fontWeight: '600' }}>
            📱 8878353787
          </a>
          <a href="https://wa.me/918878353787" target="_blank" rel="noreferrer" style={{ display: 'block', background: '#25D366', borderRadius: '10px', padding: '14px', color: 'white', textDecoration: 'none', fontWeight: '700' }}>
            💬 WhatsApp Us
          </a>
          <p style={{ marginTop: '14px', opacity: 0.8, fontSize: '13px' }}>Mon – Sat · 9:00 AM – 7:00 PM<br/>We respond within 24–48 hours</p>
        </div>

        {/* Issues we help with */}
        <div style={{ padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A8A', marginBottom: '12px' }}>🆘 We Can Help With</h2>
          {['Booking issues', 'Provider misconduct', 'Incorrect listing details', 'Platform errors', 'Account problems', 'Refund enquiries'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < 5 ? '1px solid #F1F5F9' : 'none' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A8A', marginBottom: '12px' }}>❓ FAQs</h2>
          {[
            { q: 'Is KroEasy free to use?', a: 'Yes! Browsing and booking is completely free for customers.' },
            { q: 'How do I book a service?', a: 'Browse providers, tap their card to view the full profile, then tap "Book Now". You\'ll need to create an account first.' },
            { q: 'How do I register as a service provider?', a: 'Tap Register on the home page, select "Service Provider", fill in your skills and details, and await approval.' },
            { q: 'Is my phone number visible to everyone?', a: 'Your phone number is only revealed after a user initiates a call or booking.' },
          ].map((faq, i) => (
            <div key={i} style={{ marginBottom: '12px', padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>{faq.q}</p>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6' }}>{faq.a}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <Link to="/" style={{ color: '#1E3A8A', fontWeight: '600', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg> Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
