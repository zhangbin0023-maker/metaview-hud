// 新闻/搜索 HUD — JARVIS 数据流风格
// AI 摘要、来源标签、滚动数据流

import { memo, useEffect, useRef } from 'react';
import type { SearchResult } from '../types';

interface NewsHUDProps {
  searchResult: SearchResult;
  onBack: () => void;
}

export const NewsHUD = memo(function NewsHUD({ searchResult, onBack }: NewsHUDProps) {
  const items = searchResult.results;
  const isNews = searchResult.query.includes('新闻') || searchResult.query.includes('头条');

  return (
    <div style={containerStyle}>
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span>{isNews ? 'NEWS FEED' : 'DATA SEARCH'} // {items.length} RESULTS</span>
      </div>

      {/* AI 摘要区 */}
      <div style={summaryContainerStyle}>
        <div style={summaryLabelStyle}>
          <span style={{ color: '#FFD700' }}>AI</span>
          <span style={{ color: '#888' }}> SUMMARY</span>
        </div>
        <div style={summaryTextStyle}>{searchResult.aiSummary}</div>
        <DataFlowCanvas />
      </div>

      {/* 结果列表 */}
      <div style={listContainerStyle}>
        <div style={listLabelStyle}>RESULTS</div>
        {items.slice(0, 5).map((item, i) => (
          <NewsCard key={i} item={item} index={i} />
        ))}
      </div>

      {/* 底部目标条 */}
      <div style={targetBarStyle}>
        <span style={{ color: '#FFD700' }}>DATA STREAM</span>
        <span style={{ color: '#888' }}> | </span>
        <span style={{ color: '#00E676' }}>SYNCED</span>
      </div>

      {/* 返回按钮 */}
      <button onClick={onBack} style={backBtnStyle}>BACK</button>

      <ScanBar />
    </div>
  );
});

function NewsCard({ item, index }: { item: { title: string; snippet: string; source: string }; index: number }) {
  return (
    <div style={{
      ...cardStyle,
      borderColor: index === 0 ? 'rgba(0,229,255,0.3)' : 'rgba(0,229,255,0.08)',
      background: index === 0 ? 'rgba(0,229,255,0.05)' : 'transparent',
    }}>
      {/* 序号 */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: index === 0 ? '#00E5FF' : 'rgba(0,229,255,0.2)',
        boxShadow: index === 0 ? '0 0 4px #00E5FF' : 'none',
      }} />
      <div style={{ paddingLeft: '8px' }}>
        {/* 来源标签 */}
        <div style={sourceTagStyle}>
          <span style={{ color: '#FFD700' }}>[{item.source}]</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '4px' }}>#{String(index + 1).padStart(2, '0')}</span>
        </div>
        {/* 标题 */}
        <div style={cardTitleStyle}>{item.title}</div>
        {/* 摘要 */}
        <div style={cardSnippetStyle}>{item.snippet}</div>
      </div>
    </div>
  );
}

// === 数据流 Canvas（摘要区底部装饰） ===

function DataFlowCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    // 生成随机数据柱
    const bars = Array.from({ length: 60 }, () => Math.random());

    const render = () => {
      tick += 0.05;
      ctx.clearRect(0, 0, 280, 20);

      for (let i = 0; i < bars.length; i++) {
        const offset = Math.sin(tick + i * 0.3) * 0.3;
        const h = (bars[i] + offset) * 15 + 3;
        const alpha = 0.2 + (bars[i] + offset) * 0.3;
        ctx.fillStyle = `rgba(0,229,255,${Math.max(0.1, alpha)})`;
        ctx.fillRect(i * 4.6, 20 - h, 3, h);
      }

      // 移动 bars（数据流动效果）
      if (Math.floor(tick * 2) % 3 === 0) {
        bars.shift();
        bars.push(Math.random());
      }

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={280} height={20} style={{ width: '100%', height: '16px', marginTop: '4px' }} />;
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
  padding: '16px', gap: '6px', overflow: 'hidden',
};

const statusBarStyle: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,229,255,0.08)',
  border: '0.5px solid rgba(0,229,255,0.25)',
  borderRadius: 2, padding: '2px 12px',
};

const summaryContainerStyle: React.CSSProperties = {
  background: 'rgba(255,215,0,0.04)',
  border: '0.5px solid rgba(255,215,0,0.2)',
  borderRadius: 3, padding: '8px 10px',
  marginTop: '20px',
};

const summaryLabelStyle: React.CSSProperties = {
  fontSize: '8px', fontFamily: 'monospace', letterSpacing: '0.5px',
  marginBottom: '4px',
};

const summaryTextStyle: React.CSSProperties = {
  fontSize: '11px', color: 'rgba(255,255,255,0.75)',
  lineHeight: 1.5,
};

const listContainerStyle: React.CSSProperties = {
  flex: 1, display: 'flex', flexDirection: 'column', gap: '4px',
  overflow: 'hidden',
};

const listLabelStyle: React.CSSProperties = {
  fontSize: '7px', color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace',
  letterSpacing: '0.5px', marginBottom: '2px',
};

const cardStyle: React.CSSProperties = {
  position: 'relative', padding: '6px 8px', borderRadius: 2,
  border: '0.5px solid rgba(0,229,255,0.08)',
  overflow: 'hidden',
};

const sourceTagStyle: React.CSSProperties = {
  fontSize: '7px', fontFamily: 'monospace', marginBottom: '2px',
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: '11px', color: '#fff', fontWeight: 500,
  lineHeight: 1.3, marginBottom: '2px',
};

const cardSnippetStyle: React.CSSProperties = {
  fontSize: '9px', color: 'rgba(255,255,255,0.4)',
  lineHeight: 1.4,
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
