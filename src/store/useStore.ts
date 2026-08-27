import { create } from 'zustand';
import { db, initDB, type Task, type PointLog, type LibraryItem } from '../db';

interface AppState {
  tasks: Record<number, Task[]>;
  pointLogs: PointLog[];
  library: LibraryItem[];
  totalPoints: number;
  todayStr: string;
  todayDow: number;
  bonusPoints: number;
  loading: boolean;

  loadData: () => Promise<void>;
  completeTask: (task: Task) => Promise<void>;
  uncompleteTask: (task: Task) => Promise<void>;
  addLog: (log: Omit<PointLog, 'id'>) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<number>;
  updateTask: (id: number, changes: Partial<Task>) => Promise<void>;
  deleteTask: (id: number) => Promise<void>;
  addLibItem: (item: Omit<LibraryItem, 'id' | 'createdAt'>) => Promise<number>;
  updateLibItem: (id: number, changes: Partial<LibraryItem>) => Promise<void>;
  deleteLibItem: (id: number) => Promise<void>;
  getConfig: (key: string) => Promise<string>;
  setConfig: (key: string, value: string) => Promise<void>;
  resetAll: () => Promise<void>;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useStore = create<AppState>((set, get) => ({
  tasks: {},
  pointLogs: [],
  library: [],
  totalPoints: 0,
  todayStr: getTodayStr(),
  todayDow: new Date().getDay(),
  bonusPoints: 5,
  loading: true,

  loadData: async () => {
    const allTasks = await db.tasks.toArray();
    const byDay: Record<number, Task[]> = {};
    for (let i = 0; i < 7; i++) byDay[i] = [];
    allTasks.forEach(t => {
      if (byDay[t.dayOfWeek]) byDay[t.dayOfWeek].push(t);
    });
    Object.values(byDay).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));

    const logs = await db.pointLogs.toArray();
    const total = logs.reduce((s, l) => s + l.points, 0);
    const lib = await db.library.toArray();
    const bp = parseInt((await db.config.get('bonusPoints'))?.value || '5');

    set({
      tasks: byDay,
      pointLogs: logs,
      library: lib,
      totalPoints: total,
      bonusPoints: bp,
      loading: false,
    });
  },

  completeTask: async (task: Task) => {
    const { todayStr, bonusPoints } = get();
    const todayTasks = get().tasks[get().todayDow] || [];
    const todayLogs = get().pointLogs.filter(
      l => l.date === todayStr && l.type === 'earn' && l.taskId !== null
    );
    const alreadyDone = todayLogs.some(l => l.taskId === task.id);
    if (alreadyDone) return;

    const log: Omit<PointLog, 'id'> = {
      type: 'earn',
      taskId: task.id!,
      description: `完成：${task.name}`,
      date: todayStr,
      points: task.points,
      createdAt: new Date().toISOString(),
    };
    const id = await db.pointLogs.add(log as PointLog);

    const newState = {
      pointLogs: [...get().pointLogs, { ...log, id } as PointLog],
      totalPoints: get().totalPoints + task.points,
    };
    set(newState);

    const allDone = todayTasks.every(t => {
      const logs = get().pointLogs.filter(l => l.date === todayStr && l.type === 'earn' && l.taskId !== null);
      return logs.some(l => l.taskId === t.id);
    });

    if (allDone) {
      const hasBonus = get().pointLogs.some(
        l => l.date === todayStr && l.taskId === null && l.description === '全完成奖励'
      );
      if (!hasBonus) {
        const bonusLog: Omit<PointLog, 'id'> = {
          type: 'earn',
          taskId: null,
          description: '全完成奖励',
          date: todayStr,
          points: bonusPoints,
          createdAt: new Date().toISOString(),
        };
        const bid = await db.pointLogs.add(bonusLog as PointLog);
        set({
          pointLogs: [...get().pointLogs, { ...bonusLog, id: bid } as PointLog],
          totalPoints: get().totalPoints + bonusPoints,
        });
      }
    }
  },

  addLog: async (log) => {
    const id = await db.pointLogs.add(log as PointLog);
    set({
      pointLogs: [...get().pointLogs, { ...log, id } as PointLog],
      totalPoints: get().totalPoints + log.points,
    });
  },

  uncompleteTask: async (task: Task) => {
    const { todayStr } = get();
    const log = get().pointLogs.find(
      l => l.date === todayStr && l.type === 'earn' && l.taskId === task.id
    );
    if (!log?.id) return;

    await db.pointLogs.delete(log.id);
    let newLogs = get().pointLogs.filter(l => l.id !== log.id);
    let newTotal = get().totalPoints - task.points;

    // 如果撤销后不再是全完成，且当天存在全完成奖励，则一并撤销奖励
    const todayTasks = get().tasks[get().todayDow] || [];
    const remainingDone = newLogs.filter(
      l => l.date === todayStr && l.type === 'earn' && l.taskId !== null
    );
    const stillAllDone = todayTasks.length > 0 && todayTasks.every(t =>
      remainingDone.some(l => l.taskId === t.id)
    );
    const bonusLog = newLogs.find(
      l => l.date === todayStr && l.taskId === null && l.description === '全完成奖励'
    );
    if (!stillAllDone && bonusLog?.id) {
      await db.pointLogs.delete(bonusLog.id);
      newLogs = newLogs.filter(l => l.id !== bonusLog.id);
      newTotal -= bonusLog.points;
    }

    set({ pointLogs: newLogs, totalPoints: newTotal });
  },

  addTask: async (task) => {
    const id = await db.tasks.add({ ...task, createdAt: new Date().toISOString() } as Task);
    await get().loadData();
    return id;
  },

  updateTask: async (id, changes) => {
    await db.tasks.update(id, changes);
    await get().loadData();
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    await get().loadData();
  },

  addLibItem: async (item) => {
    const id = await db.library.add({ ...item, createdAt: new Date().toISOString() } as LibraryItem);
    await get().loadData();
    return id;
  },

  updateLibItem: async (id, changes) => {
    await db.library.update(id, changes);
    await get().loadData();
  },

  deleteLibItem: async (id) => {
    await db.library.delete(id);
    await get().loadData();
  },

  getConfig: async (key) => {
    const item = await db.config.get(key);
    return item?.value || '';
  },

  setConfig: async (key, value) => {
    await db.config.put({ key, value });
    if (key === 'bonusPoints') set({ bonusPoints: parseInt(value) });
  },

  resetAll: async () => {
    await db.tasks.clear();
    await db.pointLogs.clear();
    await db.library.clear();
    await db.config.clear();
    set({ tasks: {}, pointLogs: [], library: [], totalPoints: 0 });
    await initDB();
    await get().loadData();
  },
}));
