import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PERSON_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': 'https://kroeasy.com/about#founder',
      name: 'Sultan Ali',
      alternateName: ['Sultan Ali KroEasy', 'Sultan Ali Nowrozabad', 'KroEasy founder Sultan Ali', 'Sultan Ali BCA Nowrozabad'],
      jobTitle: 'Founder & Chief Executive Officer',
      description:
        'Sultan Ali is the founder and CEO of KroEasy, a local service booking platform connecting residents of Nowrozabad and Birshingpur Pali, Madhya Pradesh with trusted service professionals. He is a BCA graduate and entrepreneur from Nowrozabad.',
      url: 'https://kroeasy.com/about',
      image: 'https://kroeasy.com/pwa-192x192.png',
      alumniOf: { '@type': 'EducationalOrganization', name: 'BCA – Bachelor of Computer Applications' },
      address: { '@type': 'PostalAddress', addressLocality: 'Nowrozabad', addressRegion: 'Madhya Pradesh', postalCode: '486447', addressCountry: 'IN' },
      affiliation: { '@id': 'https://kroeasy.com/#localbusiness' },
      sameAs: ['https://kroeasy.com', 'https://www.instagram.com/kroeasy'],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://kroeasy.com/about#webpage',
      url: 'https://kroeasy.com/about',
      name: 'Sultan Ali – Founder & CEO of KroEasy | Nowrozabad',
      description: 'Sultan Ali is the founder and CEO of KroEasy — a local service booking platform for Nowrozabad, Madhya Pradesh. BCA graduate and entrepreneur.',
      inLanguage: ['hi-IN', 'en-IN'],
      about: { '@id': 'https://kroeasy.com/about#founder' },
      breadcrumb: {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kroeasy.com/' },
          { '@type': 'ListItem', position: 2, name: 'About Founder', item: 'https://kroeasy.com/about' },
        ],
      },
    },
  ],
};

export default function AboutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = document.getElementById('about-ld-json');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'about-ld-json';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(PERSON_SCHEMA);
    document.head.appendChild(script);

    const prevTitle = document.title;
    document.title = 'Sultan Ali – Founder & CEO of KroEasy | Nowrozabad';
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content');
    metaDesc?.setAttribute('content', 'Sultan Ali is the founder and CEO of KroEasy – a local services platform for Nowrozabad and Birshingpur Pali. BCA graduate and entrepreneur from Nowrozabad, Madhya Pradesh.');

    return () => {
      document.getElementById('about-ld-json')?.remove();
      document.title = prevTitle;
      if (metaDesc && prevDesc) metaDesc.setAttribute('content', prevDesc);
    };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Top Nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#64748B', fontWeight: '600', padding: '4px 0', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to KroEasy
        </button>
        <span style={{ color: '#CBD5E1' }}>|</span>
        <span style={{ color: '#94A3B8', fontSize: '13px' }}>About / Founder</span>
      </div>

      {/* Hero Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 55%, #1D4ED8 100%)', padding: '60px 24px 80px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
          {/* Avatar */}
          <div style={{ margin: '0 auto 24px', display: 'inline-block', position: 'relative' }}>
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%',
              padding: '4px',
              background: 'linear-gradient(135deg, #F97316, #1E3A8A)',
              boxShadow: '0 0 0 4px rgba(255,255,255,0.1), 0 16px 40px rgba(0,0,0,0.4)',
              margin: '0 auto',
            }}>
              <img
                src="/founder.jpeg"
                alt="Sultan Ali – Founder of KroEasy"
                style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'top',
                  border: '3px solid #0F172A',
                  display: 'block',
                }}
              />
            </div>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontWeight: '700', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '10px' }}>
            Founder & Chief Executive Officer
          </div>
          <h1 style={{ color: 'white', fontSize: '36px', fontWeight: '900', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Sultan Ali</h1>
          <div style={{ color: '#F97316', fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>KroEasy</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span>📍 Nowrozabad, MP</span>
            <span>🎓 BCA Graduate</span>
            <span>🇮🇳 India</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '640px', margin: '-36px auto 0', padding: '0 16px 48px', position: 'relative' }}>

        {/* Vision Quote Card */}
        <div style={{
          background: 'white', borderRadius: '20px', padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)', marginBottom: '16px',
          borderLeft: '4px solid #1E3A8A'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Vision</div>
          <blockquote style={{ margin: 0, fontSize: '16px', lineHeight: '1.75', color: '#1E293B', fontStyle: 'italic', fontWeight: '500' }}>
            "Every skilled professional in Nowrozabad deserves a platform that connects them with the people who need them most — without barriers, without middlemen."
          </blockquote>
          <div style={{ marginTop: '14px', fontSize: '13px', color: '#64748B', fontWeight: '600' }}>— Sultan Ali, Founder of KroEasy</div>
        </div>

        {/* About */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>About</div>
          <p style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: '1.8', color: '#374151' }}>
            Sultan Ali is the <strong>Founder and CEO of KroEasy</strong> — a local service marketplace built to empower skilled professionals and serve the communities of Nowrozabad and Birshingpur Pali, Madhya Pradesh.
          </p>
          <p style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: '1.8', color: '#374151' }}>
            With a vision to bridge the gap between local talent and opportunity, Sultan founded KroEasy with the belief that quality services should be accessible to everyone in every neighborhood — not just in big cities.
          </p>
          <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.8', color: '#374151' }}>
            Under his leadership, KroEasy has grown into a trusted platform where electricians, plumbers, beauticians, AC technicians, carpenters, and car owners can register, get discovered, and build sustainable livelihoods in their own communities.
          </p>
        </div>

        {/* Key Facts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            { icon: '🏢', label: 'Organization', value: 'KroEasy', sub: 'Local Services Platform' },
            { icon: '🎓', label: 'Education', value: 'BCA', sub: 'Bachelor of Computer Applications' },
            { icon: '📍', label: 'Headquarters', value: 'Nowrozabad', sub: 'Madhya Pradesh, India' },
            { icon: '🎯', label: 'Mission', value: 'Empower Local Talent', sub: 'Nowrozabad & Birshingpur Pali' },
          ].map(item => (
            <div key={item.label} style={{ background: 'white', borderRadius: '16px', padding: '18px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: '26px', marginBottom: '8px' }}>{item.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Company Story */}
        <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #F0FDF4)', borderRadius: '20px', padding: '28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px', border: '1px solid #DBEAFE' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '14px' }}>The KroEasy Story</div>
          <p style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: '1.8', color: '#1E293B' }}>
            KroEasy was born from a simple observation: talented workers in Nowrozabad had no reliable way to reach customers, and residents had no easy way to find trusted help nearby.
          </p>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.8', color: '#1E293B' }}>
            Sultan Ali founded KroEasy to change that — creating a platform where <strong>verified electricians, beauticians, plumbers, AC technicians, carpenters</strong>, and <strong>car owners</strong> can list their services, connect with customers, and grow their business — entirely within their own city.
          </p>
        </div>

        {/* SEO hidden text for crawlers */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.9', color: '#94A3B8' }}>
            Sultan Ali — Founder and Owner of KroEasy, Nowrozabad, Madhya Pradesh, India. BCA graduate. Entrepreneur. Built KroEasy to connect local service workers with customers in Nowrozabad and Birshingpur Pali. KroEasy founder Sultan Ali Nowrozabad. Owner of KroEasy app Nowrozabad MP.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', padding: '16px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
            border: 'none', color: 'white', fontSize: '15px',
            fontWeight: '700', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(30,58,138,0.35)',
            letterSpacing: '0.2px'
          }}
        >
          ⚡ Explore KroEasy →
        </button>
      </div>
    </div>
  );
}
