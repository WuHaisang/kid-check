interface ProgressBarProps {
  done: number;
  total: number;
}

export default function ProgressBar({ done, total }: ProgressBarProps) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="progress-section">
      <div className="progress-label">
        <span>今日进度</span>
        <span><strong>{done}</strong> / {total}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
