// 导航 HUD 组件 — 科幻战术风格
// 600x600 加法光显示，黑色=透明
// 元素：四角瞄准框 + 雷达环 + 扫描线 + 数据流 + 语音波形 + 箭头 + 地图

import { useRef, useEffect, memo, useState } from 'react';
import type { NavRoute, GeoLocation } from '../types';
import { decodePolyline, calculateBearing, calculateDistance } from '../services/amap';

interface NavHUDProps {
  route: NavRoute;
  currentStep: number;
  location: GeoLocation;
  heading: number | null;
  speaking?: boolean;
}

export const NavHUD = memo(function NavHUD({ route, currentStep, location, heading, speaking }: NavHUDProps) {
  const step = route.steps[currentStep];
  if (!step) return null;

  const polylinePoints = decodePolyline(step.polyline);
  const nextPoint = polylinePoints[0] || route.destination.location;
  const bearing = calculateBearing(location, nextPoint);
  const distance = calculateDistance(location, nextPoint);
  const arrowRotation = heading !== null ? bearing - heading : 0;
  const totalSteps = route.steps.length;
  const accuracy = Math.round(location.accuracy || 0);

  return (
    <div style={containerStyle}>
      {/* 四角瞄准框 */}
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span style={statusTextStyle}>AGENT MODE // NAV TRACKING // GPS: ±{accuracy}m</span>
      </div>

      {/* 主区域：箭头+距离+数据 */}
      <div style={mainRowStyle}>
        {/* 左侧数据流 */}
        <DataStream side="left" location={location} heading={heading} />

        {/* 中央箭头+距离 */}
        <div style={centerArrowStyle}>
          <RadarArrowCanvas rotation={arrowRotation} action={step.action} />
        </div>
        <div style={distanceBlockStyle}>
          <div style={distanceStyle}>{formatDistance(distance)}</div>
          <div style={etaStyle}>ETA {Math.ceil(route.duration)}min // 步行 {route.duration}分钟</div>
        </div>

        {/* 右侧数据流 */}
        <DataStream side="right" step={currentStep} totalSteps={totalSteps} />
      </div>

      {/* 语音波形 */}
      <VoiceWaveform active={speaking || false} />

      {/* 指令文字带角括号 */}
      <InstructionBar text={step.instruction} />

      {/* 地图带网格和角框 */}
      <div style={mapWrapperStyle}>
        <MapCornerBrackets />
        <MiniMapCanvas route={route} currentLocation={location} heading={heading} />
      </div>

      {/* 底部目标锁定标签 */}
      <div style={targetBarStyle}>
        <span style={targetLabelStyle}>TARGETS:</span>
        <span style={targetTagStyle}>DEST LOCKED</span>
        <span style={{ ...targetTagStyle, color: '#FFD700', borderColor: 'rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.1)' }}>
          STEP {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* 底部扫描条 */}
      <ScanBar />

      {/* 到达提示 */}
      {step.action === 'arrive' && (
        <div style={arriveOverlayStyle}>
          <span style={arriveTextStyle}>ARRIVED // {route.destination.name}</span>
        </div>
      )}
    </div>
  );
});

// ============ 四角瞄准框 ============

function CornerBrackets() {
  const c = '#00E5FF';
  const s: React.CSSProperties = { position: 'absolute', width: 20, height: 20, pointerEvents: 'none' };
  const lineStyle: React.CSSProperties = { stroke: c, strokeWidth: 2, fill: 'none' };
  return (
    <>
      <svg style={{ ...s, top: 4, left: 4 }} viewBox="0 0 20 20"><path d="M0 20 L0 0 L20 0" style={lineStyle} /></svg>
      <svg style={{ ...s, top: 4, right: 4 }} viewBox="0 0 20 20"><path d="M0 0 L20 0 L20 20" style={lineStyle} /></svg>
      <svg style={{ ...s, bottom: 4, left: 4 }} viewBox="0 0 20 20"><path d="M0 0 L0 20 L20 20" style={lineStyle} /></svg>
      <svg style={{ ...s, bottom: 4, right: 4 }} viewBox="0 0 20 20"><path d="M0 20 L20 20 L20 0" style={lineStyle} /></svg>
    </>
  );
}

// ============ 雷达箭头 Canvas ============

function RadarArrowCanvas({ rotation, action }: { rotation: number; action: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  // 动画循环
  useEffect(() => {
    if (action === 'arrive') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTick(t => (t + dt * 0.5) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [action]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 140;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;

    if (action === 'arrive') {
      drawFlag(ctx, cx, cy);
      return;
    }

    // 雷达环
    const color = action === 'left' || action === 'right' ? '#FFD700' : '#00E5FF';
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;

    // 三层圆环
    [55, 42, 28].forEach((r, i) => {
      ctx.globalAlpha = 0.15 + i * 0.1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 十字准线
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(cx, 5); ctx.lineTo(cx, size - 5);
    ctx.moveTo(5, cy); ctx.lineTo(size - 5, cy);
    ctx.stroke();

    // 旋转扫描扇形
    ctx.globalAlpha = 0.15;
    const sweepAngle = tick * Math.PI * 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 55);
    grad.addColorStop(0, color + '40');
    grad.addColorStop(1, color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 55, sweepAngle - 0.6, sweepAngle);
    ctx.closePath();
    ctx.fill();

    // 八边形瞄准框
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const octR = 52;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * octR;
      const y = cy + Math.sin(a) * octR;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // 箭头（旋转）
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    drawArrow(ctx, color);
    ctx.restore();
  }, [rotation, action, tick]);

  return <canvas ref={canvasRef} style={{ width: 140, height: 140 }} />;
}

function drawArrow(ctx: CanvasRenderingContext2D, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.moveTo(0, -38);
  ctx.lineTo(-22, -8);
  ctx.lineTo(-10, -8);
  ctx.lineTo(-10, 32);
  ctx.lineTo(10, 32);
  ctx.lineTo(10, -8);
  ctx.lineTo(22, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawFlag(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.fillStyle = '#00E676';
  ctx.shadowColor = '#00E676';
  ctx.shadowBlur = 15;
  // 旗杆
  ctx.fillRect(cx - 2, cy - 35, 4, 65);
  // 旗帜
  ctx.beginPath();
  ctx.moveTo(cx + 2, cy - 35);
  ctx.lineTo(cx + 32, cy - 28);
  ctx.lineTo(cx + 22, cy - 18);
  ctx.lineTo(cx + 32, cy - 8);
  ctx.lineTo(cx + 2, cy - 15);
  ctx.closePath();
  ctx.fill();
}

// ============ 数据流 ============

function DataStream({ side, location, heading, step, totalSteps }: {
  side: 'left' | 'right';
  location?: GeoLocation;
  heading?: number | null;
  step?: number;
  totalSteps?: number;
}) {
  const isLeft = side === 'left';
  const align: React.CSSProperties = isLeft
    ? { textAlign: 'left', alignItems: 'flex-start' }
    : { textAlign: 'right', alignItems: 'flex-end' };

  return (
    <div style={{ ...dataStreamStyle, ...align }}>
      {isLeft ? (
        <>
          <div style={dataLineStyle}>LAT {location?.lat.toFixed(4) ?? '--'}</div>
          <div style={dataLineStyle}>LNG {location?.lng.toFixed(4) ?? '--'}</div>
          <div style={dataLineStyle}>HDG {heading !== null && heading !== undefined ? `${Math.round(heading).toString().padStart(3, '0')}°` : '---'}</div>
        </>
      ) : (
        <>
          <div style={dataLineStyle}>STEP {(step ?? 0) + 1}/{totalSteps ?? '?'}</div>
          <div style={dataLineStyle}>BAT --</div>
          <div style={dataLineStyle}>AI QWEN</div>
        </>
      )}
    </div>
  );
}

// ============ 语音波形 ============

function VoiceWaveform({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTick(t => t + dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 260;
    const h = 28;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = active ? '#00E5FF' : 'rgba(0,229,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x < w; x += 4) {
      const phase = active ? tick * 3 : 0;
      const amp = active ? 8 + Math.sin(x * 0.1 + phase) * 6 : 2;
      const y = h / 2 + Math.sin(x * 0.15 + phase) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [active, tick]);

  return <canvas ref={canvasRef} style={{ width: 260, height: 28, opacity: active ? 0.9 : 0.3 }} />;
}

// ============ 指令文字带角括号 ============

function InstructionBar({ text }: { text: string }) {
  return (
    <div style={instructionWrapperStyle}>
      <span style={bracketLeftStyle} />
      <div style={instructionBoxStyle}>
        <span style={instructionTextStyle}>{text}</span>
      </div>
      <span style={bracketRightStyle} />
    </div>
  );
}

// ============ 地图角框 ============

function MapCornerBrackets() {
  const c = '#00E5FF';
  const s: React.CSSProperties = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none' };
  const lineStyle: React.CSSProperties = { stroke: c, strokeWidth: 1.5, fill: 'none' };
  return (
    <>
      <svg style={{ ...s, top: 0, left: 0 }} viewBox="0 0 12 12"><path d="M0 12 L0 0 L12 0" style={lineStyle} /></svg>
      <svg style={{ ...s, top: 0, right: 0 }} viewBox="0 0 12 12"><path d="M0 0 L12 0 L12 12" style={lineStyle} /></svg>
      <svg style={{ ...s, bottom: 0, left: 0 }} viewBox="0 0 12 12"><path d="M0 0 L0 12 L12 12" style={lineStyle} /></svg>
      <svg style={{ ...s, bottom: 0, right: 0 }} viewBox="0 0 12 12"><path d="M0 12 L12 12 L12 0" style={lineStyle} /></svg>
    </>
  );
}

// ============ 简版地图 Canvas ============

function MiniMapCanvas({
  route,
  currentLocation,
  heading,
}: {
  route: NavRoute;
  currentLocation: GeoLocation;
  heading: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 280;
    const h = 160;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = 'rgba(0,229,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // 坐标投影
    const allPoints = [route.origin, route.destination.location, ...route.steps.flatMap(s => decodePolyline(s.polyline))];
    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const padding = 16;

    const project = (loc: GeoLocation): [number, number] => {
      const x = padding + ((loc.lng - minLng) / lngRange) * (w - 2 * padding);
      const y = h - padding - ((loc.lat - minLat) / latRange) * (h - 2 * padding);
      return [x, y];
    };

    // 路线
    ctx.strokeStyle = '#00E5FF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00E5FF';
    ctx.shadowBlur = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const fullPolyline = route.steps.map(s => s.polyline).join(';');
    const routePoints = decodePolyline(fullPolyline);

    ctx.beginPath();
    routePoints.forEach((pt, i) => {
      const [x, y] = project(pt);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 当前位置
    const [cx, cy] = project(currentLocation);
    ctx.shadowColor = '#00E676';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00E676';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    // 朝向指示
    if (heading !== null) {
      const rad = (heading * Math.PI) / 180;
      ctx.strokeStyle = '#00E676';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.sin(rad) * 14, cy - Math.cos(rad) * 14);
      ctx.stroke();
    }

    // 目的地
    const [dx, dy] = project(route.destination.location);
    ctx.shadowColor = '#FF3B30';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.arc(dx, dy, 6, 0, Math.PI * 2);
    ctx.fill();
  }, [route, currentLocation, heading]);

  return <canvas ref={canvasRef} style={{ width: 280, height: 160 }} />;
}

// ============ 底部扫描条 ============

function ScanBar() {
  const [pos, setPos] = useState(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPos(p => (p + dt * 0.3) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={scanBarContainerStyle}>
      <div style={{ ...scanBarBgStyle }} />
      <div style={{
        ...scanBarActiveStyle,
        left: `${pos * 80}%`,
      }} />
    </div>
  );
}

// ============ 样式 ============

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  width: '100%',
  height: '100%',
  padding: '8px',
  gap: '6px',
  overflow: 'hidden',
};

const statusBarStyle: React.CSSProperties = {
  background: 'rgba(0,229,255,0.08)',
  border: '0.5px solid rgba(0,229,255,0.25)',
  borderRadius: 2,
  padding: '2px 12px',
  marginTop: 4,
};

const statusTextStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#00E5FF',
  fontFamily: 'monospace',
  letterSpacing: '0.5px',
};

const mainRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  marginTop: '4px',
};

const centerArrowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const distanceBlockStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
};

const distanceStyle: React.CSSProperties = {
  fontSize: '42px',
  fontWeight: 700,
  color: '#FFFFFF',
  textShadow: '0 0 8px rgba(0,229,255,0.7)',
  lineHeight: 1.0,
  fontFamily: 'monospace',
};

const etaStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'monospace',
  marginTop: 2,
};

const dataStreamStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  width: 60,
  flexShrink: 0,
};

const dataLineStyle: React.CSSProperties = {
  fontSize: '9px',
  color: 'rgba(0,229,255,0.5)',
  fontFamily: 'monospace',
  letterSpacing: '0.3px',
};

const instructionWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  marginTop: '2px',
};

const instructionBoxStyle: React.CSSProperties = {
  padding: '5px 16px',
  borderRadius: 4,
  background: 'rgba(0,0,0,0.6)',
  border: '0.5px solid rgba(0,229,255,0.35)',
  maxWidth: '88%',
  textAlign: 'center',
};

const instructionTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#FFFFFF',
  fontWeight: 500,
};

const bracketLeftStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 28,
  borderTop: '2px solid #00E5FF',
  borderLeft: '2px solid #00E5FF',
  borderBottom: '2px solid #00E5FF',
  marginRight: -2,
  flexShrink: 0,
};

const bracketRightStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 8,
  height: 28,
  borderTop: '2px solid #00E5FF',
  borderRight: '2px solid #00E5FF',
  borderBottom: '2px solid #00E5FF',
  marginLeft: -2,
  flexShrink: 0,
};

const mapWrapperStyle: React.CSSProperties = {
  position: 'relative',
  marginTop: '4px',
  borderRadius: 4,
  overflow: 'hidden',
  background: 'rgba(0,0,0,0.4)',
};

const targetBarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: '8px',
  marginTop: '6px',
};

const targetLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'rgba(255,255,255,0.4)',
  fontFamily: 'monospace',
};

const targetTagStyle: React.CSSProperties = {
  fontSize: '10px',
  color: '#00E5FF',
  fontFamily: 'monospace',
  padding: '2px 8px',
  borderRadius: 2,
  background: 'rgba(0,229,255,0.1)',
  border: '0.5px solid rgba(0,229,255,0.3)',
};

const scanBarContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  height: 2,
  overflow: 'hidden',
};

const scanBarBgStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  background: 'rgba(0,229,255,0.15)',
};

const scanBarActiveStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  width: '20%',
  height: '100%',
  background: '#00E5FF',
  opacity: 0.7,
  transition: 'none',
};

const arriveOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '60px',
  left: '50%',
  transform: 'translateX(-50%)',
  padding: '8px 24px',
  borderRadius: 4,
  background: 'rgba(0,230,118,0.15)',
  border: '1px solid rgba(0,230,118,0.4)',
};

const arriveTextStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#00E676',
  fontWeight: 600,
  fontFamily: 'monospace',
  letterSpacing: '0.5px',
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
