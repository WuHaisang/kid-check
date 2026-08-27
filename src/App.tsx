import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { initDB, WEEKDAYS } from './db';
import TabBar from './components/TabBar';
import TodayPage from './pages/TodayPage';
import PointsPage from './pages/PointsPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  const [tab, setTab] = useState('today');
  const loadData = useStore(s => s.loadData);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const init = async () => {
      await initDB();
      await loadData();
    };
    init();
  }, []);

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setClock(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="app">
      <div className="status-bar">
        <span>{clock}</span>
        <span>🔋 85%</span>
      </div>
      <div className="pages">
        {tab === 'today' && <TodayPage />}
        {tab === 'points' && <PointsPage />}
        {tab === 'admin' && <AdminPage />}
      </div>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
