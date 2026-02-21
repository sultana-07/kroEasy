import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="page-container" style={{ paddingBottom: '32px' }}>
      <div className="app-header" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '800' }}>⚡ KroEasy</div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>Terms & Conditions</div>
        </div>
      </div>

      <div style={{ padding: '24px 20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>📜 Terms & Conditions</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '24px' }}>Website: KroEasy.com</p>
        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '24px', lineHeight: '1.7' }}>
          Welcome to <strong>KroEasy</strong>, a local services and car booking platform operating in Nowrozabad and Birshingpur Pali. By using our website or services, you agree to the following terms.
        </p>

        {[
          {
            title: '1. About KroEasy',
            content: 'KroEasy is a digital platform that connects users with independent service professionals including Electricians, Home Service Workers, Beauticians, Maids, Painters, Photographers, and Car Booking Providers. KroEasy acts as a facilitator and does not directly provide these services.',
          },
          {
            title: '2. User Eligibility',
            bullets: ['You must be at least 18 years old.', 'You must provide accurate information while registering.', 'You are responsible for maintaining your account credentials.'],
          },
          {
            title: '3. Service Booking',
            bullets: ['Users can directly contact or book service providers.', 'Final pricing, timing, and service details are agreed between user and service provider.', 'KroEasy is not responsible for disputes related to pricing or service quality.'],
          },
          {
            title: '4. Service Providers (Professionals)',
            intro: 'By registering as a service professional:',
            bullets: ['You confirm that your details and experience are accurate.', 'You agree to behave professionally with customers.', 'You are responsible for delivering agreed services.'],
            footer: 'KroEasy reserves the right to suspend or remove any professional for misconduct or false information.',
          },
          {
            title: '5. Payments',
            bullets: ['Payments may happen directly between user and service provider.', 'KroEasy may introduce service fees or commissions in future.', 'Any future charges will be clearly communicated.'],
          },
          {
            title: '6. Limitation of Liability',
            intro: 'KroEasy is not liable for:',
            bullets: ['Personal injury', 'Property damage', 'Service disputes', 'Payment disagreements', 'Delays caused by service providers'],
            footer: 'Users and professionals engage at their own discretion.',
          },
          {
            title: '7. Account Termination',
            intro: 'We may suspend or terminate accounts if:',
            bullets: ['False information is provided', 'Fraudulent activity is detected', 'Platform misuse occurs'],
          },
          {
            title: '8. Changes to Terms',
            content: 'KroEasy reserves the right to update these terms anytime. Continued use means acceptance of changes.',
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
            {section.footer && <p style={{ fontSize: '13px', color: '#64748B', marginTop: '8px', lineHeight: '1.6', fontStyle: 'italic' }}>{section.footer}</p>}
          </div>
        ))}

        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Link to="/" style={{ color: '#1E3A8A', fontWeight: '600', fontSize: '14px', textDecoration: 'none' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
