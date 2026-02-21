import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>Privacy Policy</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>🔒 Privacy Policy</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>Last updated: February 2025</p>

        {[
          {
            title: '1. Information We Collect',
            intro: 'We may collect:',
            bullets: ['Name', 'Phone number', 'Service preference', 'Booking history'],
          },
          {
            title: '2. How We Use Data',
            bullets: ['To connect users with professionals', 'To improve service quality', 'To contact users regarding bookings'],
            footer: 'We do not sell user data to third parties.',
          },
          {
            title: '3. Data Security',
            content: 'We take reasonable steps to protect user information, but no online platform can guarantee 100% security.',
          },
          {
            title: '4. Cookies',
            content: 'Our website may use cookies to improve user experience. You can disable cookies in your browser settings.',
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: '20px', padding: '16px', background: 'white', borderRadius: '12px', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#1E3A8A', marginBottom: '8px' }}>{section.title}</h2>
            {section.intro && <p style={{ fontSize: '13px', color: '#374151', marginBottom: '6px', lineHeight: '1.6' }}>{section.intro}</p>}
            {section.content && <p style={{ fontSize: '13px', color: '#374151', lineHeight: '1.7' }}>{section.content}</p>}
            {section.bullets && (
              <ul style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {section.bullets.map((b, j) => <li key={j} style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6' }}>{b}</li>)}
              </ul>
            )}
            {section.footer && <p style={{ fontSize: '13px', color: '#16A34A', marginTop: '8px', lineHeight: '1.6', fontWeight: '600' }}>{section.footer}</p>}
          </div>
        ))}

        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Link to="/" style={{ color: '#1E3A8A', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
