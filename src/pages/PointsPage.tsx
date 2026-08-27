import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { WEEKDAYS } from '../db';
import WeekHeatmap from '../components/WeekHeatmap';

const REDEEM_OPTS = [5, 10, 15, 20, 25, 30, 50];

export default function PointsPage() {
  const { tasks, pointLogs, totalPoints, todayDow, todayStr, addLog } = useStore();
  const [selRedeem, setSelRedeem] = useState(0);
  const [customRedeem, setCustomRedeem] = useState('');
  const [redeemReason, setRedeemReason] = useState('');
  const [toast, setToast] = useState('');

  const today = new Date();

  const weekStats = useMemo(() => {
    const day = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() + (day === 0 ? -6 : 1 - day));
    let done = 0, fullDays = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dow = d.getDay();
      const dayTasks = (tasks[dow] || []).length;
      const doneCount = pointLogs.filter(l => l.date === ds && l.type === 'earn' && l.taskId !== null).length;
      done += doneCount;
      if (doneCount >= dayTasks && dayTasks > 0) fullDays++;
    }
    return { done, fullDays };
  }, [tasks, pointLogs]);

  const recents = useMemo(() =>
    [...pointLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15),
    [pointLogs]
  );

  const formatDate = (s: string) => {
    const [, m, d] = s.split('-');
    return `${parseInt(m)}月${parseInt(d)}日`;
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const doRedeem = async () => {
    let amount = selRedeem;
    const custom = parseInt(customRedeem);
    if (!isNaN(custom) && custom >= 5) amount = custom;
    if (!amount || amount < 5) { showToast('请选择兑换数量（最小5⭐）'); return; }
    if (amount % 5 !== 0) { showToast('兑换额度需为5的整数倍'); return; }
    if (amount > totalPoints) { showToast('积分不足，当前共 ' + totalPoints + '⭐'); return; }
    if (!redeemReason.trim()) { showToast('请输入兑换原因'); return; }
    await addLog({
      type: 'spend', taskId: null,
      description: '兑换：' + redeemReason.trim(),
      date: todayStr, points: -amount,
      createdAt: new Date().toISOString(),
    });
    setSelRedeem(0); setCustomRedeem(''); setRedeemReason('');
    showToast('已扣除 ' + amount + '⭐，兑换成功！');
  };

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      <div className="points-hero">
        <div className="points-number">{totalPoints}</div>
        <div className="points-label">🐱 总积分</div>
      </div>
      <div className="points-stats">
        <div className="stat-item"><div className="stat-num">{weekStats.done}</div><div className="stat-desc">本周完成</div></div>
        <div className="stat-item"><div className="stat-num">{weekStats.fullDays}</div><div className="stat-desc">全勤天数</div></div>
      </div>
      <WeekHeatmap tasks={tasks} pointLogs={pointLogs} />

      <div className="redeem-card">
        <div className="heatmap-title" style={{ marginBottom: 12 }}>🎁 积分兑换</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {REDEEM_OPTS.map(v => {
            const disabled = totalPoints < v;
            return (
              <button
                key={v}
                className={`btn-sm ${selRedeem === v && !disabled ? 'selected' : ''}`}
                style={{
                  background: disabled ? '#f0ede8' : (selRedeem === v ? 'var(--p)' : 'var(--p)'),
                  color: disabled ? 'var(--tl)' : '#fff',
                  opacity: disabled ? .4 : 1,
                  cursor: disabled ? 'default' : 'pointer',
                }}
                disabled={disabled}
                onClick={() => !disabled && setSelRedeem(v)}
              >
                -{v}⭐
              </button>
            );
          })}
        </div>
        <div className="flex-row" style={{ marginBottom: 8 }}>
          <input
            type="number" placeholder="自定义（最小5）" min={5} step={5}
            value={customRedeem} onChange={e => setCustomRedeem(e.target.value)}
            style={{ flex: 1, maxWidth: 120, padding: 10, border: '1px solid #e0dbd4', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}
          />
          <input
            type="text" placeholder="兑换什么？" value={redeemReason}
            onChange={e => setRedeemReason(e.target.value)}
            className="flex-1" style={{ padding: 10, border: '1px solid #e0dbd4', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}
          />
        </div>
        <button className="btn btn-primary btn-block btn-sm" onClick={doRedeem}>确认兑换</button>
        <div className="hint-text" style={{ padding: '6px 0 0', fontSize: 11 }}>最小兑换单位 5⭐</div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--tl)', marginBottom: 10, fontWeight: 600 }}>📜 最近记录</div>
      <div className="record-list">
        {recents.length === 0 && <div className="hint-text">还没有打卡记录~</div>}
        {recents.map(r => {
          const d = new Date(r.date);
          const isEarn = r.points > 0;
          return (
            <div key={r.id} className="record-item">
              <span className="record-date">{formatDate(r.date)} {WEEKDAYS[d.getDay()]}</span>
              <span className="record-desc">{r.description}</span>
              <span className={`record-points ${isEarn ? 'earn' : 'spend'}`}>
                {isEarn ? '+' : ''}{r.points}⭐
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}
