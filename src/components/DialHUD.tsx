// 拨号 HUD — JARVIS 通讯面板风格
// 联系人卡片、信号波形、拨号动画

import { memo, useEffect, useRef, useState } from 'react';
import type { Contact } from '../types';
import { initiateCall } from '../services/contacts';

interface DialHUDProps {
  contacts: Contact[];
  query: string;
  onBack: () => void;
}

export const DialHUD = memo(function DialHUD({ contacts, query, onBack }: DialHUDProps) {
  const [selected, setSelected] = useState<Contact | null>(null);
  const [dialing, setDialing] = useState(false);

  // 自动选择最佳匹配
  useEffect(() => {
    if (contacts.length > 0 && !selected) {
      setSelected(contacts[0]);
    }
  }, [contacts, selected]);

  const handleCall = (contact: Contact) => {
    setSelected(contact);
    setDialing(true);
    initiateCall(contact.phone);
  };

  return (
    <div style={containerStyle}>
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span>COMMS // {query ? `SEARCH: ${query}` : 'CONTACT LIST'}</span>
      </div>

      {selected ? (
        /* 拨号中面板 */
        <DialingPanel contact={selected} dialing={dialing} onBack={() => { setDialing(false); setSelected(null); }} />
      ) : contacts.length > 0 ? (
        /* 联系人列表 */
        <div style={listContainerStyle}>
          <div style={listLabelStyle}>MATCHED CONTACTS // {contacts.length}</div>
          {contacts.slice(0, 4).map((c, i) => (
            <button
              key={c.id}
              onClick={() => handleCall(c)}
              style={{
                ...contactCardStyle,
                borderColor: i === 0 ? 'rgba(0,229,255,0.4)' : 'rgba(0,229,255,0.12)',
                background: i === 0 ? 'rgba(0,229,255,0.08)' : 'rgba(0,229,255,0.02)',
              }}
            >
              {/* 匹配度条 */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                background: i === 0 ? '#00E5FF' : 'rgba(0,229,255,0.3)',
                boxShadow: i === 0 ? '0 0 6px #00E5FF' : 'none',
              }} />
              <div style={{ flex: 1, paddingLeft: '8px' }}>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: 500 }}>{c.name}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                  {c.phone}
                </div>
              </div>
              {/* 匹配置信度 */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '8px', color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace' }}>MATCH</div>
                <div style={{ fontSize: '12px', color: '#00E5FF', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {Math.round(c.matched * 100)}%
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={emptyStyle}>
          <SignalCanvas active={false} />
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: '50px' }}>
            NO CONTACTS FOUND
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', marginTop: '4px' }}>
            Try: "打电话给张三"
          </div>
        </div>
      )}

      {/* 底部目标条 */}
      <div style={targetBarStyle}>
        <span style={{ color: '#FFD700' }}>COMMS LINK</span>
        <span style={{ color: '#888' }}> | </span>
        <span style={{ color: dialing ? '#00E676' : '#555' }}>
          {dialing ? 'DIALING...' : 'STANDBY'}
        </span>
      </div>

      {/* 返回按钮 */}
      <button onClick={onBack} style={backBtnStyle}>BACK</button>

      <ScanBar />
    </div>
  );
});

// === 拨号中面板 ===

function DialingPanel({ contact, dialing, onBack }: { contact: Contact; dialing: boolean; onBack: () => void }) {
  return (
    <div style={dialingContainerStyle}>
      <SignalCanvas active={dialing} />

      {/* 联系人名称 */}
      <div style={{
        fontSize: '24px', color: '#fff', fontFamily: 'monospace',
        fontWeight: 500, marginTop: '30px',
        textShadow: '0 0 12px rgba(0,229,255,0.5)',
      }}>
        {contact.name}
      </div>

      {/* 电话号码 */}
      <div style={{
        fontSize: '14px', color: '#00E5FF', fontFamily: 'monospace',
        letterSpacing: '1px', marginTop: '4px',
      }}>
        {contact.phone}
      </div>

      {/* 拨号状态 */}
      <div style={{
        fontSize: '10px', color: dialing ? '#00E676' : 'rgba(255,255,255,0.3)',
        fontFamily: 'monospace', marginTop: '8px',
        letterSpacing: '0.5px',
      }}>
        {dialing ? '> CONNECTING...' : '> SELECTED'}
      </div>

      {/* 取消按钮 */}
      <button onClick={onBack} style={cancelBtnStyle}>END</button>
    </div>
  );
}

// === 信号波形 Canvas ===

function SignalCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const render = () => {
      tick += active ? 0.15 : 0.03;
      ctx.clearRect(0, 0, 240, 80);

      const cx = 120;
      const cy = 40;

      // 中心圆
      ctx.fillStyle = active ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.05)';
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();

      // 波形（同心圆扩散）
      for (let i = 0; i < 5; i++) {
        const phase = (tick + i * 0.5) % 3;
        const radius = 20 + phase * 15;
        const alpha = Math.max(0, 1 - phase / 3) * (active ? 0.4 : 0.15);
        ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 中央信号波
      ctx.strokeStyle = active ? '#00E676' : '#00E5FF';
      ctx.lineWidth = 2;
      ctx.shadowColor = active ? '#00E676' : '#00E5FF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let x = 0; x < 240; x += 2) {
        const wave = Math.sin(x * 0.08 + tick * 3) * (active ? 12 : 4) * Math.sin(x * 0.02);
        if (x === 0) {
          ctx.moveTo(x, cy + wave);
        } else {
          ctx.lineTo(x, cy + wave);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={canvasRef} width={240} height={80} style={{ width: '200px', height: '66px' }} />;
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

const listContainerStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '6px',
  marginTop: '20px',
};

const listLabelStyle: React.CSSProperties = {
  fontSize: '8px', color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace',
  letterSpacing: '0.5px', marginBottom: '2px',
  borderBottom: '0.5px solid rgba(0,229,255,0.15)', paddingBottom: '4px',
};

const contactCardStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center',
  padding: '8px 10px', borderRadius: 2,
  border: '0.5px solid rgba(0,229,255,0.12)',
  cursor: 'pointer', textAlign: 'left',
  position: 'relative', overflow: 'hidden',
};

const dialingContainerStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  position: 'relative',
};

const emptyStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
};

const cancelBtnStyle: React.CSSProperties = {
  marginTop: '16px', padding: '4px 16px', borderRadius: 2,
  background: 'rgba(255,59,48,0.1)',
  border: '0.5px solid rgba(255,59,48,0.3)',
  color: '#FF3B30', fontSize: '10px',
  fontFamily: 'monospace', letterSpacing: '0.5px',
  cursor: 'pointer',
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
