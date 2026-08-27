import { useMemo, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { WEEKDAYS } from '../db';
import TaskItem from '../components/TaskItem';
import ProgressBar from '../components/ProgressBar';
import WeekHeatmap from '../components/WeekHeatmap';

export default function TodayPage() {
  const { tasks, pointLogs, todayStr, todayDow, bonusPoints, completeTask } = useStore();
  const [celebrate, setCelebrate] = useState(false);

  const todayTasks = tasks[todayDow] || [];
  const todayLogs = pointLogs.filter(l => l.date === todayStr && l.type === 'earn' && l.taskId !== null);
  const doneIds = new Set(todayLogs.map(l => l.taskId));
  const doneCount = doneIds.size;
  const total = todayTasks.length;
  const allDone = total > 0 && doneCount === total;

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const prevAllDone = useMemo(() => allDone, [allDone]);
  useEffect(() => {
    if (allDone && !prevAllDone) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3000);
    }
  }, [allDone]);

  const handleCheck = useCallback((task: any) => {
    completeTask(task);
  }, [completeTask]);

  return (
    <>
      {celebrate && <CelebrateOverlay />}
      <div className="page-header">
        <div>
          <h1>{dateStr}</h1>
          <div className="sub">🐱 今天也要像猫咪一样认真哦~</div>
        </div>
        <div className="badge">{WEEKDAYS[todayDow]}</div>
      </div>
      <ProgressBar done={doneCount} total={total} />
      <div className={`bonus-hint ${allDone ? 'all-done' : ''}`}>
        {allDone
          ? `🐱 喵~全部完成！额外获得 +${bonusPoints} ⭐`
          : `🐾 今日全部完成可额外获得 +${bonusPoints} ⭐`
        }
      </div>
      <div className="task-list">
        {todayTasks.map(task => (
          <TaskItem
            key={task.id}
            name={task.name}
            points={task.points}
            done={doneIds.has(task.id!)}
            onCheck={() => handleCheck(task)}
          />
        ))}
      </div>
      <WeekHeatmap tasks={tasks} pointLogs={pointLogs} />
    </>
  );
}

function CelebrateOverlay() {
  const emojis = ['🐱', '⭐', '🐾', '🧶', '🐟', '✨', '🌟'];
  return (
    <div className="celebrate-overlay">
      <div className="celebrate-text">🐱 喵~全部完成啦！</div>
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          className="celebrate-star"
          style={{
            left: `${Math.random() * 90}%`,
            top: '-60px',
            animationDelay: `${Math.random() * 1.5}s`,
            animationDuration: `${1.5 + Math.random() * 1.5}s`,
            fontSize: `${24 + Math.random() * 16}px`,
          }}
        >
          {emojis[Math.floor(Math.random() * emojis.length)]}
        </div>
      ))}
    </div>
  );
}
