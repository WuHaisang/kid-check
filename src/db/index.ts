import Dexie, { type Table } from 'dexie';

export interface Task {
  id?: number;
  dayOfWeek: number;
  name: string;
  points: number;
  isFixed: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
}

export interface PointLog {
  id?: number;
  type: 'earn' | 'spend';
  taskId: number | null;
  description: string;
  date: string;
  points: number;
  createdAt: string;
}

export interface LibraryItem {
  id?: number;
  name: string;
  points: number;
  category: '学习' | '生活' | '运动';
  createdAt: string;
}

export interface Config {
  key: string;
  value: string;
}

class KidCheckDB extends Dexie {
  tasks!: Table<Task, number>;
  pointLogs!: Table<PointLog, number>;
  library!: Table<LibraryItem, number>;
  config!: Table<Config, string>;

  constructor() {
    super('KidDailyCheck');
    this.version(1).stores({
      tasks: '++id, dayOfWeek, isFixed',
      pointLogs: '++id, type, date, taskId',
      library: '++id, category',
      config: '&key',
    });
  }
}

export const db = new KidCheckDB();

export const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

export const CORE_TASKS: Omit<Task, 'dayOfWeek' | 'createdAt'>[] = [
  { name: '数感小超市 1页', points: 2, isFixed: true, sortOrder: 1, active: true },
  { name: '蘑菇练习题 2页', points: 2, isFixed: true, sortOrder: 2, active: true },
  { name: '斑马英文课件+练习册', points: 2, isFixed: true, sortOrder: 3, active: true },
  { name: 'ABC-Reading 3本', points: 2, isFixed: true, sortOrder: 4, active: true },
  { name: '古诗', points: 2, isFixed: true, sortOrder: 5, active: true },
  { name: '整理书包', points: 1, isFixed: true, sortOrder: 6, active: true },
];

export const DAILY_DEFAULTS: Record<number, Omit<Task, 'dayOfWeek' | 'createdAt'>[]> = {
  0: [...CORE_TASKS.map(t => ({ ...t })), { name: '乒乓球', points: 2, isFixed: true, sortOrder: 7, active: true }],
  1: [...CORE_TASKS.map(t => ({ ...t })), { name: '游泳', points: 2, isFixed: true, sortOrder: 7, active: true }, { name: '外教课', points: 2, isFixed: true, sortOrder: 8, active: true }],
  2: [...CORE_TASKS.map(t => ({ ...t })), { name: '乒乓球', points: 2, isFixed: true, sortOrder: 7, active: true }],
  3: [...CORE_TASKS.map(t => ({ ...t })), { name: '游泳', points: 2, isFixed: true, sortOrder: 7, active: true }],
  4: [...CORE_TASKS.map(t => ({ ...t })), { name: '国际象棋', points: 2, isFixed: true, sortOrder: 7, active: true }],
  5: [...CORE_TASKS.map(t => ({ ...t }))],
  6: [...CORE_TASKS.map(t => ({ ...t })), { name: '外教课', points: 2, isFixed: true, sortOrder: 7, active: true }, { name: '足球', points: 2, isFixed: true, sortOrder: 8, active: true }],
};

export const DEFAULT_LIBRARY: Omit<LibraryItem, 'createdAt'>[] = [
  { name: '数感小超市 1页', points: 2, category: '学习' },
  { name: '学而思 思维作业', points: 5, category: '学习' },
  { name: '学而思 人文作业', points: 5, category: '学习' },
  { name: '蘑菇练习题 2页', points: 2, category: '学习' },
  { name: '斑马英文课件+练习册', points: 2, category: '学习' },
  { name: 'ABC-Reading 3本', points: 2, category: '学习' },
  { name: '幼儿园写字', points: 2, category: '学习' },
  { name: '古诗', points: 2, category: '学习' },
  { name: '外教课', points: 2, category: '学习' },
  { name: '国际象棋', points: 2, category: '学习' },
  { name: '整理书包', points: 1, category: '生活' },
  { name: '乒乓球', points: 2, category: '运动' },
  { name: '游泳', points: 2, category: '运动' },
  { name: '足球', points: 2, category: '运动' },
  { name: '闷水憋气 15s', points: 2, category: '运动' },
];

export const DEFAULT_CONFIG: Record<string, string> = {
  adminPassword: '123456',
  bonusPoints: '5',
};

export async function initDB() {
  const initialized = await db.config.get('initialized');
  if (initialized?.value === 'true') return;

  await db.transaction('rw', db.tasks, db.library, db.config, async () => {
    for (const [day, tasks] of Object.entries(DAILY_DEFAULTS)) {
      const dayNum = parseInt(day);
      for (const t of tasks) {
        await db.tasks.add({
          ...t,
          dayOfWeek: dayNum,
          createdAt: new Date().toISOString(),
        });
      }
    }

    for (const item of DEFAULT_LIBRARY) {
      await db.library.add({
        ...item,
        createdAt: new Date().toISOString(),
      });
    }

    for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
      await db.config.put({ key, value });
    }

    await db.config.put({ key: 'initialized', value: 'true' });
  });
}
