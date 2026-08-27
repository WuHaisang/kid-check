import { useMemo } from 'react';
import { WEEKDAYS, type PointLog, type Task } from '../db';

interface WeekHeatmapProps {
  tasks: Record<number, Task[]>;
  pointLogs: PointLog[];
}

export default function WeekHeatmap({ tasks, pointLogs }: WeekHeatmapProps) {
  const days = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dow = d.getDay();
      const dayTasks = tasks[dow] || [];
      const doneCount = pointLogs.filter(l => l.date === ds && l.type === 'earn' && l.taskId !== null).length;
      let cls = '';
      if (doneCount === 0 && dayTasks.length > 0) cls = 'missed';
      else if (doneCount > 0 && doneCount < dayTasks.length && dayTasks.length > 0) cls = 'partial';
      else if (doneCount >= dayTasks.length && dayTasks.length > 0) cls = 'done';
      return { label: WEEKDAYS[dow][1], cls };
    });
  }, [tasks, pointLogs]);

  return (
    <div className="mini-heatmap">
      <div className="heatmap-title">📅 本周完成情况</div>
      <div className="heatmap-days">
        {days.map((d, i) => (
          <div key={i} className={`heatmap-day ${d.cls}`}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}
