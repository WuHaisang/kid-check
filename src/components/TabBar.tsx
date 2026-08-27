interface TabBarProps {
  active: string;
  onChange: (tab: string) => void;
}

export default function TabBar({ active, onChange }: TabBarProps) {
  const tabs = [
    { key: 'today', icon: '📋', label: '今日任务' },
    { key: 'points', icon: '⭐', label: '我的积分' },
    { key: 'admin', icon: '🐱', label: '管理' },
  ];

  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.key}
          className={`tab-item ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          <div className="tab-icon">{t.icon}</div>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
