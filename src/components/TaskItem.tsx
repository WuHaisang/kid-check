import { useState } from 'react';

interface TaskItemProps {
  name: string;
  points: number;
  done: boolean;
  onCheck: () => void;
  onUncheck?: () => void;
}

export default function TaskItem({ name, points, done, onCheck, onUncheck }: TaskItemProps) {
  const [ripple, setRipple] = useState(false);

  const handleClick = () => {
    if (done) {
      if (onUncheck) onUncheck();
      return;
    }
    setRipple(true);
    playSound();
    setTimeout(() => setRipple(false), 600);
    onCheck();
  };

  return (
    <div
      className={`task-item ${done ? 'done' : ''}`}
      onClick={handleClick}
    >
      <div className="check-circle">
        <svg className="check-paw" viewBox="0 0 24 24" width="24" height="24">
          <ellipse cx="12" cy="14" rx="6" ry="5.5" fill="white" />
          <circle cx="6" cy="6.5" r="3" fill="white" />
          <circle cx="12" cy="5" r="2.8" fill="white" />
          <circle cx="18" cy="6.5" r="3" fill="white" />
        </svg>
      </div>
      <div className="task-info">
        <div className="task-name">{name}</div>
      </div>
      <div className="task-points">+{points}⭐</div>
      {ripple && <div style={{
        position: 'absolute', width: 40, height: 40, borderRadius: '50%',
        background: 'rgba(106,171,115,.25)', pointerEvents: 'none',
        animation: 'ripple .6s ease-out forwards'
      }} />}
    </div>
  );
}

function playSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1100, ctx.currentTime + .08);
    g.gain.setValueAtTime(.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.01, ctx.currentTime + .25);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + .25);
  } catch (_) {}
}
