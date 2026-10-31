// 翻译 HUD — JARVIS 翻译器风格
// 双语对照面板、语音波形、语言标识

import { memo, useEffect, useRef } from 'react';
import type { TranslationResult } from '../types';

interface TranslateHUDProps {
  translation: TranslationResult;
  speaking: boolean;
  onBack: () => void;
}

export const TranslateHUD = memo(function TranslateHUD({ translation, speaking, onBack }: TranslateHUDProps) {
  return (
    <div style={containerStyle}>
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span>TRANSLATE // {translation.detectedLang} → {translation.targetLang}</span>
      </div>

      {/* 语言标识 */}
      <div style={langBarStyle}>
        <div style={langTagStyle}>
          <span style={{ color: '#00E5FF' }}>SRC</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>{translation.detectedLang}</span>
        </div>
        <div style={arrowStyle}>→</div>
        <div style={langTagStyle}>
          <span style={{ color: '#FFD700' }}>TGT</span>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>{translation.targetLang}</span>
        </div>
      </div>

      {/* 原文 */}
      <div style={sourceContainerStyle}>
        <div style={labelStyle}>
          <span style={{ color: 'rgba(0,229,255,0.5)' }}>SOURCE</span>
        </div>
        <div style={sourceTextStyle}>{translation.sourceText}</div>
      </div>

      {/* 中央翻译动画 */}
      <TranslateWaveCanvas active={speaking} />

      {/* 译文 */}
      <div style={targetContainerStyle}>
        <div style={labelStyle}>
          <span style={{ color: 'rgba(255,215,0,0.5)' }}>TRANSLATION</span>
        </div>
        <div style={targetTextStyle}>{translation.targetText}</div>
        {translation.pronunciation && (
          <div style={pronunciationStyle}>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>PRON: </span>
            {translation.pronunciation}
          </div>
        )}
      </div>

      {/* 底部目标条 */}
      <div style={targetBarStyle}>
        <span style={{ color: '#FFD700' }}>LANG ENGINE</span>
        <span style={{ color: '#888' }}> | </span>
        <span style={{ color: '#00E676' }}>READY</span>
      </div>

      {/* 返回按钮 */}
      <button onClick={onBack} style={backBtnStyle}>BACK</button>

      <ScanBar />
    </div>
  );
});

// === 翻译波形 Canvas ===

function TranslateWaveCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const render = () => {
      tick += active ? 0.12 : 0.04;
      ctx.clearRect(0, 0, 280, 40);

      const cy = 20;

      // 双向波形
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00E5FF';
      ctx.shadowBlur = active ? 6 : 2;

      ctx.beginPath();
      for (let x = 0; x < 140; x += 1) {
        const wave1 = Math.sin(x * 0.1 + tick * 2) * (active ? 10 : 3);
        const wave2 = Math.sin(x * 0.05 + tick) * (active ? 6 : 2);
        const y = cy + wave1 + wave2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.beginPath();
      for (let x = 140; x < 280; x += 1) {
        const wave1 = Math.sin(x * 0.1 + tick * 2 + Math.PI) * (active ? 10 : 3);
        const wave2 = Math.sin(x * 0.05 + tick + Math.PI) * (active ? 6 : 2);
        const y = cy + wave1 + wave2;
        if (x === 140) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 中央分隔线
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(140, 0);
      ctx.lineTo(140, 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // 箭头
      ctx.fillStyle = 'rgba(0,229,255,0.4)';
      ctx.beginPath();
      ctx.moveTo(135, 20);
      ctx.lineTo(140, 15);
      ctx.lineTo(145, 20);
      ctx.lineTo(140, 25);
      ctx.closePath();
      ctx.fill();

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={canvasRef} width={280} height={40} style={{ width: '100%', height: '32px' }} />;
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

const langBarStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center',
  justifyContent: 'center', gap: '12px',
  marginTop: '16px',
};

const langTagStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center',
  fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.5px',
  background: 'rgba(0,229,255,0.05)',
  border: '0.5px solid rgba(0,229,255,0.15)',
  borderRadius: 2, padding: '2px 8px',
};

const arrowStyle: React.CSSProperties = {
  fontSize: '16px', color: 'rgba(0,229,255,0.4)',
};

const sourceContainerStyle: React.CSSProperties = {
  background: 'rgba(0,229,255,0.03)',
  border: '0.5px solid rgba(0,229,255,0.15)',
  borderRadius: 3, padding: '8px 10px',
};

const targetContainerStyle: React.CSSProperties = {
  background: 'rgba(255,215,0,0.03)',
  border: '0.5px solid rgba(255,215,0,0.15)',
  borderRadius: 3, padding: '8px 10px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '7px', fontFamily: 'monospace', letterSpacing: '0.5px',
  marginBottom: '4px',
};

const sourceTextStyle: React.CSSProperties = {
  fontSize: '14px', color: 'rgba(255,255,255,0.8)',
  lineHeight: 1.5,
};

const targetTextStyle: React.CSSProperties = {
  fontSize: '14px', color: '#fff',
  lineHeight: 1.5, fontWeight: 500,
  textShadow: '0 0 8px rgba(255,215,0,0.2)',
};

const pronunciationStyle: React.CSSProperties = {
  fontSize: '10px', color: 'rgba(255,255,255,0.35)',
  fontFamily: 'monospace', marginTop: '4px',
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
