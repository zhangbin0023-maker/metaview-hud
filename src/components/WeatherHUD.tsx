// 天气 HUD — 科幻战术风格天气面板
// JARVIS 风：大号温度数字、动态天气图标、空气质量条、四角瞄准框

import { memo, useEffect, useRef } from 'react';
import type { WeatherData, AirQuality, GeoLocation } from '../types';
import { getAQIColor, getAQILevel, getTempColor } from '../services/weather';

interface WeatherHUDProps {
  weather: WeatherData;
  airQuality: AirQuality | null;
  location: GeoLocation | null;
  onBack: () => void;
}

export const WeatherHUD = memo(function WeatherHUD({ weather, airQuality, location, onBack }: WeatherHUDProps) {
  const tempColor = getTempColor(weather.temperature);
  const aqiColor = airQuality ? getAQIColor(airQuality.aqi) : '#888';
  const aqiLevel = airQuality ? getAQILevel(airQuality.aqi) : 'N/A';

  return (
    <div style={containerStyle}>
      <CornerBrackets />

      {/* 顶部状态条 */}
      <div style={statusBarStyle}>
        <span>WEATHER SCAN // {weather.city} // {weather.reportTime.split(' ')[1] || ''}</span>
      </div>

      {/* 主温度区 */}
      <div style={mainRowStyle}>
        {/* 左侧数据流 */}
        <div style={dataStreamStyle}>
          <div style={dataLabelStyle}>LAT</div>
          <div style={dataValueStyle}>{location ? location.lat.toFixed(3) : '---'}</div>
          <div style={{ ...dataLabelStyle, marginTop: '6px' }}>LNG</div>
          <div style={dataValueStyle}>{location ? location.lng.toFixed(3) : '---'}</div>
          <div style={{ ...dataLabelStyle, marginTop: '6px' }}>HUM</div>
          <div style={dataValueStyle}>{weather.humidity}%</div>
        </div>

        {/* 中央温度 */}
        <div style={tempContainerStyle}>
          <WeatherIconCanvas conditionCode={weather.conditionCode} />
          <div style={{
            ...tempStyle,
            color: tempColor,
            textShadow: `0 0 20px ${tempColor}88`,
          }}>
            {weather.temperature}°
          </div>
          <div style={conditionStyle}>{weather.condition}</div>
        </div>

        {/* 右侧数据流 */}
        <div style={dataStreamStyle}>
          <div style={dataLabelStyle}>WIND</div>
          <div style={dataValueStyle}>{weather.windDirection} {weather.windPower}级</div>
          <div style={{ ...dataLabelStyle, marginTop: '6px' }}>PRES</div>
          <div style={dataValueStyle}>{weather.pressure || '---'}hPa</div>
          <div style={{ ...dataLabelStyle, marginTop: '6px' }}>VIS</div>
          <div style={dataValueStyle}>{weather.visibility || '---'}km</div>
        </div>
      </div>

      {/* 空气质量条 */}
      {airQuality && (
        <div style={aqiContainerStyle}>
          <div style={aqiLabelStyle}>AIR QUALITY INDEX</div>
          <div style={aqiRowStyle}>
            <div style={{
              ...aqiValueStyle,
              color: aqiColor,
              textShadow: `0 0 12px ${aqiColor}66`,
            }}>
              {airQuality.aqi}
            </div>
            <div style={aqiLevelStyle}>
              <span style={{ color: aqiColor, fontWeight: 'bold' }}>{aqiLevel}</span>
              <span style={{ color: '#888', marginLeft: '6px' }}>PM2.5 {airQuality.pm25}</span>
            </div>
          </div>
          {/* AQI 条形图 */}
          <AQIBar aqi={airQuality.aqi} color={aqiColor} />
          {/* 分项指标 */}
          <div style={pollutantRowStyle}>
            <PollutantChip label="PM10" value={airQuality.pm10} />
            <PollutantChip label="O3" value={airQuality.o3} />
            <PollutantChip label="NO2" value={airQuality.no2} />
            <PollutantChip label="SO2" value={airQuality.so2} />
            <PollutantChip label="CO" value={airQuality.co} />
          </div>
        </div>
      )}

      {/* 底部目标条 */}
      <div style={targetBarStyle}>
        <span style={{ color: '#FFD700' }}>WEATHER LOCK</span>
        <span style={{ color: '#888' }}> | </span>
        <span style={{ color: '#00E676' }}>DATA SYNCED</span>
      </div>

      {/* 返回按钮 */}
      <button onClick={onBack} style={backBtnStyle}>BACK</button>

      <ScanBar />
    </div>
  );
});

// === 天气图标 Canvas ===

function WeatherIconCanvas({ conditionCode }: { conditionCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    const render = () => {
      tick += 0.02;
      ctx.clearRect(0, 0, 100, 100);

      const cx = 50;
      const cy = 50;

      // 外圈雷达环
      ctx.strokeStyle = 'rgba(0,229,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0,229,255,0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, 38, 0, Math.PI * 2);
      ctx.stroke();

      // 扫描扇形
      const sweepAngle = tick % (Math.PI * 2);
      const gradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, 45);
      gradient.addColorStop(0, 'rgba(0,229,255,0.3)');
      gradient.addColorStop(1, 'rgba(0,229,255,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 45, sweepAngle, sweepAngle + Math.PI / 6);
      ctx.closePath();
      ctx.fill();

      // 根据天气类型绘制不同图标
      ctx.save();
      ctx.translate(cx, cy);

      switch (conditionCode) {
        case 'clear':
          drawSun(ctx, tick);
          break;
        case 'cloudy':
          drawCloud(ctx, tick, 0.7);
          break;
        case 'overcast':
          drawCloud(ctx, tick, 1);
          break;
        case 'rain_light':
        case 'rain_medium':
        case 'rain_heavy':
        case 'rain_storm':
          drawRain(ctx, tick);
          break;
        case 'thunderstorm':
          drawThunder(ctx, tick);
          break;
        case 'snow':
          drawSnow(ctx, tick);
          break;
        case 'fog':
        case 'haze':
          drawFog(ctx, tick);
          break;
        default:
          drawSun(ctx, tick);
      }

      ctx.restore();

      raf = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(raf);
  }, [conditionCode]);

  return <canvas ref={canvasRef} width={100} height={100} style={{ width: '80px', height: '80px' }} />;
}

function drawSun(ctx: CanvasRenderingContext2D, tick: number) {
  const r = 15;
  // 太阳光线
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + tick * 0.5;
    const x1 = Math.cos(angle) * (r + 5);
    const y1 = Math.sin(angle) * (r + 5);
    const x2 = Math.cos(angle) * (r + 12);
    const y2 = Math.sin(angle) * (r + 12);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // 太阳本体
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCloud(ctx: CanvasRenderingContext2D, _tick: number, opacity: number) {
  ctx.fillStyle = `rgba(200,210,220,${opacity * 0.8})`;
  ctx.shadowColor = 'rgba(200,210,220,0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-8, 0, 10, 0, Math.PI * 2);
  ctx.arc(0, -5, 12, 0, Math.PI * 2);
  ctx.arc(8, 0, 10, 0, Math.PI * 2);
  ctx.arc(0, 3, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawRain(ctx: CanvasRenderingContext2D, tick: number) {
  drawCloud(ctx, tick, 0.9);
  ctx.strokeStyle = '#5AC8FA';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const x = -8 + i * 5;
    const y = 10 + ((tick * 20 + i * 5) % 15);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + 5);
    ctx.stroke();
  }
}

function drawThunder(ctx: CanvasRenderingContext2D, tick: number) {
  drawCloud(ctx, tick, 0.9);
  ctx.fillStyle = '#FFD700';
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 10;
  const flash = Math.sin(tick * 5) > 0.7 ? 1 : 0.3;
  ctx.globalAlpha = flash;
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(2, 12);
  ctx.lineTo(-1, 13);
  ctx.lineTo(3, 20);
  ctx.lineTo(-1, 15);
  ctx.lineTo(2, 14);
  ctx.lineTo(-3, 10);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawSnow(ctx: CanvasRenderingContext2D, tick: number) {
  drawCloud(ctx, tick, 0.9);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 5;
  for (let i = 0; i < 5; i++) {
    const x = -10 + i * 5;
    const y = 10 + Math.sin(tick * 2 + i) * 3 + i * 2;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawFog(ctx: CanvasRenderingContext2D, tick: number) {
  ctx.strokeStyle = 'rgba(180,190,200,0.6)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = -10 + i * 6;
    const offset = Math.sin(tick + i) * 3;
    ctx.beginPath();
    ctx.moveTo(-18 + offset, y);
    ctx.lineTo(18 + offset, y);
    ctx.stroke();
  }
}

// === AQI 条形图 ===

function AQIBar({ aqi, color }: { aqi: number; color: string }) {
  const pct = Math.min(aqi / 300, 1) * 100;
  return (
    <div style={{
      width: '100%', height: '4px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 2, marginTop: '4px', overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: color,
        boxShadow: `0 0 8px ${color}`,
        transition: 'width 0.5s ease',
      }} />
      {/* 刻度线 */}
      {[50, 100, 150, 200].map(v => (
        <div key={v} style={{
          position: 'absolute',
          left: `${(v / 300) * 100}%`,
          top: '-2px',
          width: '1px', height: '8px',
          background: 'rgba(255,255,255,0.15)',
        }} />
      ))}
    </div>
  );
}

function PollutantChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '1px',
    }}>
      <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{label}</span>
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', fontWeight: 'bold' }}>
        {value}
      </span>
    </div>
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
  padding: '16px', gap: '10px', overflow: 'hidden',
};

const statusBarStyle: React.CSSProperties = {
  position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
  background: 'rgba(0,229,255,0.08)',
  border: '0.5px solid rgba(0,229,255,0.25)',
  borderRadius: 2, padding: '2px 12px',
};

const mainRowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center',
  justifyContent: 'space-between', flex: 1, marginTop: '20px',
};

const dataStreamStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column',
};

const dataLabelStyle: React.CSSProperties = {
  fontSize: '7px', color: 'rgba(0,229,255,0.4)', fontFamily: 'monospace',
  letterSpacing: '0.5px',
};

const dataValueStyle: React.CSSProperties = {
  fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace',
};

const tempContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
};

const tempStyle: React.CSSProperties = {
  fontSize: '52px', fontWeight: 200, fontFamily: 'monospace',
  lineHeight: 1,
};

const conditionStyle: React.CSSProperties = {
  fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace',
  letterSpacing: '0.5px',
};

const aqiContainerStyle: React.CSSProperties = {
  background: 'rgba(0,229,255,0.03)',
  border: '0.5px solid rgba(0,229,255,0.15)',
  borderRadius: 3, padding: '8px 12px',
};

const aqiLabelStyle: React.CSSProperties = {
  fontSize: '8px', color: 'rgba(0,229,255,0.5)', fontFamily: 'monospace',
  letterSpacing: '0.5px', marginBottom: '4px',
};

const aqiRowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px',
};

const aqiValueStyle: React.CSSProperties = {
  fontSize: '24px', fontWeight: 'bold', fontFamily: 'monospace',
};

const aqiLevelStyle: React.CSSProperties = {
  fontSize: '9px', fontFamily: 'monospace', letterSpacing: '0.3px',
};

const pollutantRowStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', justifyContent: 'space-between',
  marginTop: '6px',
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
