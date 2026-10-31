// 提醒 HUD — JARVIS 任务追踪面板风格
// 大号倒计时、脉冲动画、任务列表

import { memo, useState, useEffect, useRef } from 'react';
import type { Reminder } from '../types';
import { formatReminderTime, formatCountdown } from '../services/reminder';

interface ReminderHUDProps {
  reminders: Reminder[];
  onDismiss: (id: string) => void;
  onBack: () => void;
}

export const ReminderHUD = memo(function ReminderHUD({ reminders, onDismiss, onBack }: ReminderHUDProps) {
  const activeReminders = reminders.filter(r => r.active).sort((a, b) => a.time - b.time);
  const nextReminder = activeReminders[0];
  const [, forceTick] = useState(0);

  // 每秒更新倒计时
  useEffect(() => {
    const interval = setInterval(() => forceTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={containerStyle}>
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span>TASK TRACKER // {activeReminders.length} ACTIVE</span>
      </div>

      {/* 主倒计时区 */}
      {nextReminder ? (
        <CountdownPanel reminder={nextReminder} onDismiss={() => onDismiss(nextReminder.id)} />
      ) : (
        <div style={emptyStyle}>
          <PulseRing color="#00E5FF" />
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: '50px' }}>
            NO ACTIVE TASKS
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: '4px' }}>
            Say "Jarvis, 3点提醒我开会" to create
          </div>
        </div>
      )}

      {/* 提醒列表 */}
      {activeReminders.length > 1 && (
        <div style={listContainerStyle}>
          <div style={listLabelStyle}>QUEUE</div>
          {activeReminders.slice(1, 5).map((r, i) => (
            <div key={r.id} style={listItemStyle}>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', fontSize: '8px' }}>
                {String(i + 2).padStart(2, '0')}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>{r.title}</span>
              <span style={{ color: '#00E5FF', fontFamily: 'monospace', fontSize: '9px', marginLeft: 'auto' }}>
                {formatReminderTime(r.time)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 底部目标条 */}
      <div style={targetBarStyle}>
        <span style={{ color: '#FFD700' }}>TASK SYS</span>
        <span style={{ color: '#888' }}> | </span>
        <span style={{ color: activeReminders.length > 0 ? '#00E676' : '#555' }}>
          {activeReminders.length > 0 ? 'MONITORING' : 'IDLE'}
        </span>
      </div>

      {/* 返回按钮 */}
      <button onClick={onBack} style={backBtnStyle}>BACK</button>

      <ScanBar />
    </div>
  );
});

// === 倒计时面板 ===

function CountdownPanel({ reminder, onDismiss }: { reminder: Reminder; onDismiss: () => void }) {
  const countdown = formatCountdown(reminder.time);
  const color = countdown.urgent ? '#FF3B30' : '#00E5FF';

  return (
    <div style={countdownContainerStyle}>
      {/* 脉冲圆环 */}
      <PulseRing color={color} urgent={countdown.urgent} />

      {/* 倒计时数字 */}
      <div style={{
        ...countdownStyle,
        color,
        textShadow: `0 0 20px ${color}88`,
      }}>
        {countdown.text}
      </div>

      {/* 任务标题 */}
      <div style={taskTitleStyle}>{reminder.title}</div>

      {/* 时间描述 */}
      <div style={timeDescStyle}>{formatReminderTime(reminder.time)}</div>

      {/* 取消按钮 */}
      <button onClick={onDismiss} style={dismissBtnStyle}>CANCEL</button>
    </div>
  );
}

// === 脉冲圆环 ===

function PulseRing({ color, urgent }: { color: string; urgent?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const render = () => {
      tick += urgent ? 0.08 : 0.03;
      ctx.clearRect(0, 0, 120, 120);

      const cx = 60;
      const cy = 60;

      // 外圈固定环
      ctx.strokeStyle = `${color}33`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.stroke();

      // 脉冲环（扩散）
      for (let i = 0; i < 3; i++) {
        const phase = (tick + i * 2) % 6;
        const radius = 20 + phase * 5;
        const alpha = Math.max(0, 1 - phase / 6) * 0.3;
        ctx.strokeStyle = `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 内圈
      ctx.strokeStyle = `${color}88`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 35, 0, Math.PI * 2);
      ctx.stroke();

      // 十字准线
      ctx.strokeStyle = `${color}22`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx - 55, cy);
      ctx.lineTo(cx + 55, cy);
      ctx.moveTo(cx, cy - 55);
      ctx.lineTo(cx, cy + 55);
      ctx.stroke();

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [color, urgent]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={120}
      style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }}
    />
  );
}

// === 四角瞄准框 ===

function CornerBrackets() {
  const c = '#00E5FF';
  const s: React.CSSProperties = { position: 'absolute', width: 16, height: 16, pointerEvents: 'none' };
  const ls: React.CSSProperties = { stroke: c, strokeWidth: 1.5, fill: 'none' };
  return (
    <>
      <svg style={{ ...s, top: 4, left: 4 }} viewBox="0 0 16 16"><path d="M0 16 L0 0 L16 0" style={ls} /></svg>
      <svg style={{ ...s, top: 4, right: 4 }} viewBox="0 0 16 16"><path d="M0 0 L16 0 L16 16" style={ls} /></svg>
      <svg style={{ ...s, bottom: 4, left: 4 }} viewBox="0 0 16 16"><path d="M0 0 L0 16 L16 16" style={ls} /></svg>
      <svg style={{ ...s, bottom: 4, right: 4 }} viewBox="0 0 16 16"><path d="M0 16 L16 16 L16 0" style={ls} /></svg>
    </>
  );
}

function ScanBar() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%',
        width: '30%',
        background: 'linear-gradient(90deg, transparent, #00E5FF, transparent)',
        animation: 'scanmove 3s linear infinite',
      }} />
      <style>{`@keyframes scanmove { 0%{left:-30%} 100%{left:100%} }`}</style>
    </div>
  );
}

// === 样式 ===

const containerStyle: React.CSSProperties = {
  position: 'relative', width: '100%', height: '100%',
  background: '#000', display: 'flex', flexDirection: 'column',
  padding: '16px', gap: '8px', overflow: 'hidden',
};

const statusBarStyle: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,229,255,0.08)',
  border: '0.5px solid rgba(0,229,255,0.25)',
  borderRadius: 2, padding: '2px 12px',
};

const emptyStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

const countdownContainerStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  position: 'relative', paddingTop: '20px',
};

const countdownStyle: React.CSSProperties = {
  fontSize: '40px', fontWeight: 200, fontFamily: 'monospace',
  lineHeight: 1, zIndex: 1,
};

const taskTitleStyle: React.CSSProperties = {
  fontSize: '14px', color: '#fff', fontFamily: 'monospace',
  marginTop: '8px', textAlign: 'center',
};

const timeDescStyle: React.CSSProperties = {
  fontSize: '10px', color: 'rgba(255,255,255,0.4)',
  fontFamily: 'monospace', marginTop: '2px',
};

const dismissBtnStyle: React.CSSProperties = {
  marginTop: '12px', padding: '4px 14px', borderRadius: 2,
  background: 'rgba(255,59,48,0.1)',
  border: '0.5px solid rgba(255,59,48,0.3)',
  color: '#FF3B30', fontSize: '9px',
  fontFamily: 'monospace', letterSpacing: '0.5px',
  cursor: 'pointer',
};

const listContainerStyle: React.CSSProperties = {
  background: 'rgba(0,229,255,0.03)',
  border: '0.5px solid rgba(0,229,255,0.15)',
  borderRadius: 3, padding: '6px 10px',
};

const listLabelStyle: React.CSSProperties = {
  fontSize: '7px', color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace',
  letterSpacing: '0.5px', marginBottom: '4px',
};

const listItemStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center',
  gap: '6px', padding: '3px 0',
};

const targetBarStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', gap: '4px',
  fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.3px',
};

const backBtnStyle: React.CSSProperties = {
  position: 'absolute', top: 10, right: 28,
  padding: '3px 10px', borderRadius: 2,
  background: 'rgba(0,229,255,0.1)',
  border: '0.5px solid rgba(0,229,255,0.3)',
  color: '#00E5FF', fontSize: '9px',
  fontFamily: 'monospace', letterSpacing: '0.5px',
  cursor: 'pointer',
};
