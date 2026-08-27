import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { WEEKDAYS, db, type Task, type LibraryItem } from '../db';

type AdminTab = 'tasks' | 'library' | 'settings';

export default function AdminPage() {
  const store = useStore();
  const [password, setPassword] = useState('');
  const [passwordHash, setPasswordHash] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AdminTab>('tasks');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const [modal, setModal] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    store.getConfig('adminPassword').then(pwd => setPasswordHash(pwd));
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  const handleLogin = () => {
    if (password === passwordHash) { setLoggedIn(true); setError(''); }
    else setError('密码错误，请重试');
  };

  if (!loggedIn) {
    return (
      <div className="admin-gate">
        <div className="gate-icon">🐱</div>
        <h2>家长管理后台</h2>
        <input
          type="password" className="pwd-input" placeholder="输入密码"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
        <div className="pwd-error">{error || '\u00A0'}</div>
        <button className="btn btn-primary" onClick={handleLogin}>进入管理</button>
      </div>
    );
  }

  return (
    <>
      {toast && <div className="toast">{toast}</div>}
      {modal}
      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'tasks' ? 'active' : ''}`} onClick={() => { setEditingDay(null); setTab('tasks'); }}>📋 任务</button>
        <button className={`admin-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>📚 选择库</button>
        <button className={`admin-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙ 设置</button>
      </div>
      {tab === 'tasks' && <TasksTab store={store} editingDay={editingDay} setEditingDay={setEditingDay} showToast={showToast} setModal={setModal} />}
      {tab === 'library' && <LibraryTab store={store} showToast={showToast} setModal={setModal} />}
      {tab === 'settings' && <SettingsTab store={store} showToast={showToast} setModal={setModal} setLoggedIn={setLoggedIn} />}
    </>
  );
}

// ============ TASKS TAB ============
function TasksTab({ store, editingDay, setEditingDay, showToast, setModal }: any) {
  if (editingDay !== null) return <DayEdit store={store} day={editingDay} onBack={() => setEditingDay(null)} showToast={showToast} setModal={setModal} />;
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tl)', marginBottom: 10, fontWeight: 600 }}>点击某天编辑任务</div>
      <div className="day-grid">
        {[0, 1, 2, 3, 4, 5, 6].map(d => {
          const count = (store.tasks[d] || []).length;
          return (
            <div key={d} className="day-card" onClick={() => setEditingDay(d)}>
              <div className="day-name">{WEEKDAYS[d]}</div>
              <div className="day-count">{count}项</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayEdit({ store, day, onBack, showToast, setModal }: any) {
  const ts: Task[] = store.tasks[day] || [];
  const fixed = ts.filter((t: Task) => t.isFixed);
  const temp = ts.filter((t: Task) => !t.isFixed);

  const addTask = (isFixed: boolean) => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <h3>添加{isFixed ? '固定' : '临时'}任务</h3>
          <input type="text" id="mdName" placeholder="任务名称" />
          <input type="number" id="mdPts" placeholder="积分值" defaultValue={5} min={1} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const name = (document.getElementById('mdName') as HTMLInputElement).value.trim();
              const pts = parseInt((document.getElementById('mdPts') as HTMLInputElement).value) || 5;
              if (!name) { showToast('请输入任务名称'); return; }
              await store.addTask({ dayOfWeek: day, name, points: pts, isFixed, sortOrder: ts.length, active: true });
              setModal(null); showToast('已添加');
            }}>确认添加</button>
          </div>
        </div>
      </div>
    );
  };

  const pickFromLib = () => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <h3>📚 从选择库添加</h3>
          <div className="lib-pick">
            {store.library.map((item: LibraryItem) => (
              <div key={item.id} className="lpi" data-id={item.id} onClick={e => (e.currentTarget as HTMLElement).classList.toggle('sel')}>
                <span className="lpn">{item.name}</span>
                <span className="lpp">+{item.points}⭐</span>
              </div>
            ))}
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const sel = document.querySelectorAll('.lib-pick .lpi.sel');
              if (!sel.length) { showToast('请至少选择一个'); return; }
              for (const el of sel) {
                const libItem = store.library.find((l: LibraryItem) => l.id === parseInt((el as HTMLElement).dataset.id!));
                if (libItem) await store.addTask({ dayOfWeek: day, name: libItem.name, points: libItem.points, isFixed: false, sortOrder: ts.length, active: true });
              }
              setModal(null); showToast(`已添加 ${sel.length} 个任务`);
            }}>确认添加</button>
          </div>
        </div>
      </div>
    );
  };

  const chgPts = (task: Task) => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal">
          <h3>修改「{task.name}」积分</h3>
          <input type="number" id="mdPtsVal" defaultValue={task.points} min={1} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const v = parseInt((document.getElementById('mdPtsVal') as HTMLInputElement).value);
              if (isNaN(v) || v < 1) { showToast('请输入有效分值'); return; }
              await store.updateTask(task.id!, { points: v });
              setModal(null); showToast('分值已更新');
            }}>确认</button>
          </div>
        </div>
      </div>
    );
  };

  const delTask = async (task: Task) => {
    if (!confirm(`删除「${task.name}」？`)) return;
    await store.deleteTask(task.id!);
    showToast('已删除');
  };

  return (
    <div className="edit-section">
      <button className="btn-back" onClick={onBack}>← 返回周总览</button>
      <h3>📝 编辑{WEEKDAYS[day]}任务</h3>
      <div className="section-div">▼ 固定任务（每周自动加载）</div>
      {fixed.map((t: Task) => (
        <div key={t.id} className="edit-task-item">
          <span className="name">{t.name}</span>
          <span className="points" onClick={() => chgPts(t)}>+{t.points}⭐</span>
          <span className="e-type fixed">固定</span>
          <button className="del-btn" onClick={() => delTask(t)}>✕</button>
        </div>
      ))}
      <button className="add-task-btn" onClick={() => addTask(true)}>+ 添加固定任务</button>
      <div className="section-div" style={{ marginTop: 16 }}>▼ 临时任务（仅今天，可从库中添加）</div>
      {temp.map((t: Task) => (
        <div key={t.id} className="edit-task-item">
          <span className="name">{t.name}</span>
          <span className="points" onClick={() => chgPts(t)}>+{t.points}⭐</span>
          <span className="e-type temp">临时</span>
          <button className="del-btn" onClick={() => delTask(t)}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="add-task-btn" style={{ flex: 1 }} onClick={() => addTask(false)}>+ 新建临时任务</button>
        <button className="add-task-btn" style={{ flex: 1 }} onClick={pickFromLib}>📚 从选择库添加</button>
      </div>
    </div>
  );
}

// ============ LIBRARY TAB ============
function LibraryTab({ store, showToast, setModal }: any) {
  const CATS = ['学习', '生活', '运动'];
  const CAT_ICONS: Record<string, string> = { '学习': '📖', '生活': '🏠', '运动': '⚽' };
  const grouped: Record<string, LibraryItem[]> = {};
  store.library.forEach((item: LibraryItem) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  const addItem = () => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal"><h3>添加选择库项目</h3>
          <input type="text" id="libName" placeholder="任务名称" />
          <input type="number" id="libPts" placeholder="积分值" defaultValue={5} min={1} />
          <select id="libCat"><option value="学习">📖 学习</option><option value="生活">🏠 生活</option><option value="运动">⚽ 运动</option></select>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const n = (document.getElementById('libName') as HTMLInputElement).value.trim();
              const p = parseInt((document.getElementById('libPts') as HTMLInputElement).value) || 5;
              const c = (document.getElementById('libCat') as HTMLSelectElement).value;
              if (!n) { showToast('请输入名称'); return; }
              await store.addLibItem({ name: n, points: p, category: c as any });
              setModal(null); showToast('已添加');
            }}>确认添加</button>
          </div></div></div>
    );
  };

  const chgPts = (item: LibraryItem) => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal"><h3>修改「{item.name}」积分</h3>
          <input type="number" id="libPtsVal" defaultValue={item.points} min={1} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const v = parseInt((document.getElementById('libPtsVal') as HTMLInputElement).value);
              if (isNaN(v) || v < 1) { showToast('请输入有效分值'); return; }
              await store.updateLibItem(item.id!, { points: v });
              setModal(null); showToast('分值已更新');
            }}>确认</button>
          </div></div></div>
    );
  };

  const delItem = async (item: LibraryItem) => {
    if (!confirm('删除此选择库项目？')) return;
    await store.deleteLibItem(item.id!);
    showToast('已删除');
  };

  const catCls = (c: string) => c === '学习' ? 'study' : c === '生活' ? 'life' : 'sport';

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tl)', marginBottom: 10, fontWeight: 600 }}>管理任务选择库（在编辑任务时快速选取）</div>
      <div className="lib-list">
        {CATS.map(cat => {
          const items = grouped[cat] || [];
          if (!items.length) return null;
          return (
            <div key={cat}>
              <div className="lib-cat">{CAT_ICONS[cat]} {cat}</div>
              {items.map(item => (
                <div key={item.id} className="lib-item">
                  <span className={`cat-tag ${catCls(cat)}`}>{cat}</span>
                  <span className="name">{item.name}</span>
                  <span className="pts" onClick={() => chgPts(item)}>+{item.points}⭐</span>
                  <button className="del" onClick={() => delItem(item)}>✕</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <button className="add-task-btn" onClick={addItem}>+ 添加选择库项目</button>
    </div>
  );
}

// ============ SETTINGS TAB ============
function SettingsTab({ store, showToast, setModal, setLoggedIn }: any) {
  const [adjType, setAdjType] = useState('spend');
  const [adjReason, setAdjReason] = useState('');
  const [adjAmt, setAdjAmt] = useState('');
  const todayStr = store.todayStr;

  const doAdjust = async () => {
    if (!adjReason.trim()) { showToast('请输入原因'); return; }
    const amt = parseInt(adjAmt);
    if (isNaN(amt) || amt <= 0) { showToast('请输入有效分数'); return; }
    const pts = adjType === 'earn' ? amt : -amt;
    const desc = adjType === 'earn' ? '奖励：' + adjReason.trim() : '扣除：' + adjReason.trim();
    await store.addLog({ type: adjType as any, taskId: null, description: desc, date: todayStr, points: pts, createdAt: new Date().toISOString() });
    setAdjReason(''); setAdjAmt('');
    showToast(adjType === 'earn' ? '已奖励 +' + amt + ' ⭐' : '已扣除 -' + amt + ' ⭐');
  };

  const chPwd = () => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal"><h3>修改管理密码</h3>
          <input type="password" id="newPwd" placeholder="新密码" />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const v = (document.getElementById('newPwd') as HTMLInputElement).value.trim();
              if (!v) { showToast('密码不能为空'); return; }
              await store.setConfig('adminPassword', v);
              setModal(null); showToast('密码已修改');
            }}>确认</button>
          </div></div></div>
    );
  };

  const chBonus = () => {
    setModal(
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
        <div className="modal"><h3>修改每日全完成奖励</h3>
          <input type="number" id="newBonus" placeholder="奖励积分" defaultValue={store.bonusPoints} min={0} />
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              const v = parseInt((document.getElementById('newBonus') as HTMLInputElement).value);
              if (isNaN(v) || v < 0) { showToast('请输入有效数字'); return; }
              await store.setConfig('bonusPoints', String(v));
              setModal(null); showToast('奖励已修改');
            }}>确认</button>
          </div></div></div>
    );
  };

  const doReset = async () => {
    if (!confirm('⚠️ 确定要清空所有数据吗？')) return;
    if (!confirm('再次确认：所有任务配置、积分记录都将清除！')) return;
    await store.resetAll();
    setLoggedIn(false);
    showToast('所有数据已重置');
  };

  const doExport = async () => {
    try {
      const data = {
        tasks: Object.fromEntries(
          Object.entries(store.tasks).map(([k, v]: [string, any]) => [k, v.map((t: any) => ({
            dayOfWeek: t.dayOfWeek, name: t.name, points: t.points,
            isFixed: t.isFixed, sortOrder: t.sortOrder, active: t.active
          }))])
        ),
        pointLogs: store.pointLogs.map((l: any) => ({
          type: l.type, taskId: l.taskId, description: l.description,
          date: l.date, points: l.points, createdAt: l.createdAt
        })),
        library: store.library.map((l: any) => ({
          name: l.name, points: l.points, category: l.category
        })),
        config: { adminPassword: await store.getConfig('adminPassword'), bonusPoints: String(store.bonusPoints) },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kid-check-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('数据已导出');
    } catch { showToast('导出失败'); }
  };

  const doImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.tasks || !data.pointLogs || !data.library) {
          showToast('文件格式不正确'); return;
        }
        if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;
        await db.tasks.clear(); await db.pointLogs.clear();
        await db.library.clear(); await db.config.clear();

        for (const [day, tasks] of Object.entries(data.tasks)) {
          for (const t of tasks as any[]) {
            await db.tasks.add({ ...t, dayOfWeek: parseInt(day), createdAt: new Date().toISOString() });
          }
        }
        for (const l of data.pointLogs) {
          await db.pointLogs.add(l);
        }
        for (const l of data.library) {
          await db.library.add({ ...l, createdAt: new Date().toISOString() });
        }
        for (const [k, v] of Object.entries(data.config || {})) {
          await db.config.put({ key: k, value: String(v) });
        }
        await db.config.put({ key: 'initialized', value: 'true' });
        await store.loadData();
        showToast('数据导入成功！请刷新页面');
      } catch { showToast('导入失败，请检查文件'); }
    };
    input.click();
  };

  return (
    <div>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--p)' }}>{store.totalPoints}</div>
        <div style={{ fontSize: 13, color: 'var(--tl)' }}>当前总积分</div>
      </div>

      <div className="section-div">积分调整</div>
      <div className="settings-list">
        <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ marginBottom: 10, fontSize: 14, fontWeight: 500 }}>手动调整积分</div>
          <select value={adjType} onChange={e => setAdjType(e.target.value)} style={{ marginBottom: 8, padding: 8, borderRadius: 8, border: '1px solid #e0dbd4', fontSize: 13, fontFamily: 'inherit' }}>
            <option value="spend">扣除积分（-）</option>
            <option value="earn">奖励积分（+）</option>
          </select>
          <input type="text" placeholder="原因" value={adjReason} onChange={e => setAdjReason(e.target.value)} style={{ marginBottom: 8, padding: 10, border: '1px solid #e0dbd4', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
          <div className="flex-row">
            <input type="number" placeholder="分数" value={adjAmt} onChange={e => setAdjAmt(e.target.value)} min={1} className="flex-1" style={{ padding: 10, border: '1px solid #e0dbd4', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }} />
            <button className="btn btn-primary btn-sm" onClick={doAdjust} style={{ whiteSpace: 'nowrap' }}>确认</button>
          </div>
        </div>
      </div>

      <div className="section-div">⚙ 系统设置</div>
      <div className="settings-list">
        <div className="setting-item"><span className="setting-label">管理密码</span><span className="setting-value">****** <a href="#" onClick={e => { e.preventDefault(); chPwd(); }}>修改</a></span></div>
        <div className="setting-item"><span className="setting-label">每日全完成奖励</span><span className="setting-value">{store.bonusPoints}⭐ <a href="#" onClick={e => { e.preventDefault(); chBonus(); }}>修改</a></span></div>
        <div className="setting-item"><span className="setting-label danger">清空所有数据</span><button className="btn btn-danger btn-sm" onClick={doReset}>危险操作</button></div>
      </div>

      <div className="section-div" style={{ marginTop: 8 }}>💾 数据备份</div>
      <div className="settings-list">
        <div className="setting-item">
          <span className="setting-label">📤 导出备份</span>
          <button className="btn btn-primary btn-sm" onClick={doExport}>导出JSON</button>
        </div>
        <div className="setting-item">
          <span className="setting-label">📥 导入恢复</span>
          <button className="btn btn-primary btn-sm" onClick={doImport}>选择文件</button>
        </div>
        <div className="hint-text" style={{ textAlign: 'left' }}>导出为 JSON 文件保存到平板本地。换设备或重装后可导入恢复所有数据。</div>
      </div>
    </div>
  );
}
