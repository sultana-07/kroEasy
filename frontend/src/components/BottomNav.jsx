export default function BottomNav({ active, onChange, role }) {
  const tabs = role === 'user'
    ? [
        { key: 'services', icon: '👷', label: 'Services' },
        { key: 'cars', icon: '🚗', label: 'Cars' },
        { key: 'profile', icon: '👤', label: 'Profile' },
      ]
    : [];

  if (tabs.length === 0) return null;

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`bottom-nav-item ${active === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
          id={`nav-${tab.key}`}
        >
          <span style={{ fontSize: '22px' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
