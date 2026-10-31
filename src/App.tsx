// TurboMeta Agent HUD — 主应用组件
// JARVIS 风格多模块智能助手 HUD

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppState, Settings, POI, NavRoute, GeoLocation, AIProvider, Reminder } from './types';
import { PROVIDERS, DEFAULT_SETTINGS } from './types';
import { useGeolocation, useHeading, useTTS } from './hooks/device';
import { searchNearby, planWalkingRoute, reverseGeocode } from './services/amap';
import { processUserIntent } from './services/ai';
import { getWeather, getAirQuality } from './services/weather';
import { parseReminder, getReminders, saveReminder, dismissReminder, checkDueReminders } from './services/reminder';
import { matchContact } from './services/contacts';
import { searchWeb } from './services/news';
import { translateText } from './services/translate';
import { NavHUD } from './components/NavHUD';
import { WeatherHUD } from './components/WeatherHUD';
import { ReminderHUD } from './components/ReminderHUD';
import { DialHUD } from './components/DialHUD';
import { NewsHUD } from './components/NewsHUD';
import { TranslateHUD } from './components/TranslateHUD';

export function App() {
  // 设置
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('turbometa_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  // URL 参数（从 TurboMeta APP Deep Link 传入）
  const [, setUrlIntent] = useState<URLSearchParams | null>(null);

  // 设备能力
  const { location, startWatch } = useGeolocation();
  const { heading, requestPermission } = useHeading();
  const { speak, speaking } = useTTS(settings.ttsEnabled);

  // App 状态（扩展支持所有模块）
  const [state, setState] = useState<AppState>({
    mode: 'idle',
    location: null,
    heading: null,
    route: null,
    currentStep: 0,
    nearbyPOIs: [],
    weather: null,
    airQuality: null,
    reminders: getReminders(),
    contacts: [],
    newsItems: [],
    searchResult: null,
    translation: null,
    error: null,
    speaking: false,
  });

  // 启动 GPS 和方向传感器
  useEffect(() => {
    startWatch();
    requestPermission();
  }, [startWatch, requestPermission]);

  // 更新位置和朝向到 state
  useEffect(() => {
    setState(s => ({ ...s, location, heading }));
  }, [location, heading]);

  // 定时检查到期提醒
  useEffect(() => {
    const interval = setInterval(() => {
      const due = checkDueReminders();
      if (due.length > 0) {
        const r = due[0];
        speak(`提醒：${r.title}`);
        setState(s => ({ ...s, mode: 'remind', reminders: getReminders() }));
      }
    }, 30000); // 每30秒检查
    return () => clearInterval(interval);
  }, [speak]);

  // 处理 URL 参数（Deep Link 传来的意图）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get('intent');
    if (intent) {
      setUrlIntent(params);
      handleUrlIntent(params);
    }
  }, [location]);

  // 保存设置
  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('turbometa_settings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ============ URL 意图处理 ============

  const handleUrlIntent = useCallback(async (params: URLSearchParams) => {
    const intent = params.get('intent');
    const dest = params.get('dest');
    const lat = params.get('lat');
    const lng = params.get('lng');

    if (intent === 'navigation' && dest) {
      await startNavigation(dest, lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined);
    } else if (intent === 'search' && dest) {
      await handleSearchNearby(dest);
    } else if (intent === 'weather') {
      await handleWeather();
    } else if (intent === 'remind') {
      const text = params.get('text');
      if (text) await handleSetReminder(text);
      else setState(s => ({ ...s, mode: 'remind' }));
    } else if (intent === 'dial') {
      const name = params.get('name') || dest || '';
      await handleDial(name);
    } else if (intent === 'news') {
      const query = params.get('q') || '今天的新闻头条';
      await handleNews(query);
    } else if (intent === 'translate') {
      const text = params.get('text') || '';
      if (text) await handleTranslate(text);
    } else if (intent === 'text') {
      const text = params.get('text');
      if (text) await processTextIntent(text);
    } else if (intent === 'tool') {
      const toolName = params.get('tool');
      if (toolName) {
        const args: Record<string, string> = {};
        params.forEach((value, key) => {
          if (key !== 'intent' && key !== 'tool') {
            args[key] = value;
          }
        });
        await executeToolCall(toolName, args);
      }
    }
  }, [location]);

  // ============ 导航 ============

  const startNavigation = useCallback(async (destination: string, destLoc?: GeoLocation) => {
    if (!location) {
      setState(s => ({ ...s, error: '定位中，请稍候' }));
      return;
    }

    try {
      setState(s => ({ ...s, mode: 'searching', error: null }));

      let targetPOI: POI;

      if (destLoc) {
        targetPOI = { id: 'direct', name: destination, type: '', address: '', location: destLoc, distance: 0 };
      } else {
        const pois = await searchNearby(settings.amapKey, location, destination, 2000);
        if (pois.length === 0) {
          setState(s => ({ ...s, mode: 'idle', error: `未找到"${destination}"` }));
          speak(`未找到${destination}`);
          return;
        }
        targetPOI = pois[0];
      }

      const routeData = await planWalkingRoute(settings.amapKey, location, targetPOI.location);
      const route: NavRoute = {
        origin: location, destination: targetPOI,
        distance: routeData.distance, duration: routeData.duration,
        steps: routeData.steps, polyline: routeData.polyline,
      };

      setState(s => ({ ...s, mode: 'navigating', route, currentStep: 0, error: null }));
      speak(`开始导航到${targetPOI.name}，距离${routeData.distance}米，预计步行${routeData.duration}分钟。${routeData.steps[0]?.instruction || ''}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '导航失败';
      setState(s => ({ ...s, mode: 'idle', error: msg }));
      speak('导航失败');
    }
  }, [location, settings.amapKey, speak]);

  // ============ 周边搜索 ============

  const handleSearchNearby = useCallback(async (keyword: string) => {
    if (!location) {
      setState(s => ({ ...s, error: '定位中，请稍候' }));
      return;
    }

    try {
      const pois = await searchNearby(settings.amapKey, location, keyword, 1000);
      setState(s => ({ ...s, mode: 'searching', nearbyPOIs: pois, error: null }));
      if (pois.length > 0) {
        const top3 = pois.slice(0, 3).map(p => `${p.name}，${p.distance}米`).join('；');
        speak(`找到${pois.length}个结果：${top3}`);
      } else {
        speak(`未找到${keyword}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '搜索失败';
      setState(s => ({ ...s, error: msg }));
    }
  }, [location, settings.amapKey, speak]);

  // ============ 天气 ============

  const handleWeather = useCallback(async () => {
    if (!location) {
      setState(s => ({ ...s, error: '定位中，请稍候' }));
      return;
    }

    try {
      setState(s => ({ ...s, mode: 'weather', error: null }));
      const [weather, aq] = await Promise.all([
        getWeather(settings.amapKey, location),
        getAirQuality(settings.amapKey, location),
      ]);
      setState(s => ({ ...s, weather, airQuality: aq, error: null }));
      speak(`${weather.city}，${weather.condition}，${weather.temperature}度，湿度${weather.humidity}%`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '天气获取失败';
      setState(s => ({ ...s, mode: 'idle', error: msg }));
      speak('天气获取失败');
    }
  }, [location, settings.amapKey, speak]);

  // ============ 提醒 ============

  const handleSetReminder = useCallback(async (text: string) => {
    const parsed = parseReminder(text);
    if (!parsed) {
      setState(s => ({ ...s, mode: 'remind', error: '无法解析提醒时间' }));
      speak('无法解析提醒时间');
      return;
    }

    const reminder: Reminder = {
      id: `r_${Date.now()}`,
      title: parsed.title,
      time: parsed.time,
      active: true,
      createdAt: Date.now(),
    };

    saveReminder(reminder);
    setState(s => ({ ...s, mode: 'remind', reminders: getReminders(), error: null }));
    speak(`已设置提醒：${parsed.title}，${parsed.relativeDescription}`);
  }, [speak]);

  const handleDismissReminder = useCallback((id: string) => {
    dismissReminder(id);
    setState(s => ({ ...s, reminders: getReminders() }));
  }, []);

  // ============ 拨号 ============

  const handleDial = useCallback(async (name: string) => {
    const contacts = matchContact(name);
    setState(s => ({ ...s, mode: 'dial', contacts, error: null }));
    if (contacts.length > 0) {
      speak(`找到${contacts.length}个联系人：${contacts.slice(0, 2).map(c => c.name).join('、')}`);
    } else {
      speak(`未找到联系人${name}`);
    }
  }, [speak]);

  // ============ 新闻搜索 ============

  const handleNews = useCallback(async (query: string) => {
    if (!settings.apiKey) {
      setState(s => ({ ...s, error: '请先配置 API Key' }));
      return;
    }

    try {
      setState(s => ({ ...s, mode: 'news', error: null }));
      const provider = getProvider();
      const result = await searchWeb(provider, query, location);
      setState(s => ({ ...s, searchResult: result, error: null }));
      speak(result.aiSummary.slice(0, 100));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '搜索失败';
      setState(s => ({ ...s, mode: 'idle', error: msg }));
      speak('搜索失败');
    }
  }, [settings, location, speak]);

  // ============ 翻译 ============

  const handleTranslate = useCallback(async (text: string) => {
    if (!settings.apiKey) {
      setState(s => ({ ...s, error: '请先配置 API Key' }));
      return;
    }

    try {
      setState(s => ({ ...s, mode: 'translate', error: null }));
      const provider = getProvider();
      const result = await translateText(provider, text);
      setState(s => ({ ...s, translation: result, error: null }));
      speak(result.targetText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '翻译失败';
      setState(s => ({ ...s, mode: 'idle', error: msg }));
      speak('翻译失败');
    }
  }, [settings, speak]);

  // ============ AI 意图解析 ============

  const getProvider = useCallback((): AIProvider => {
    const config = PROVIDERS[settings.providerId] || PROVIDERS.alibaba;
    return {
      ...config,
      apiKey: settings.apiKey,
      baseURL: settings.providerId === 'azure' ? settings.azureEndpoint || '' : config.baseURL,
    };
  }, [settings]);

  const processTextIntent = useCallback(async (text: string) => {
    if (!settings.apiKey) {
      setState(s => ({ ...s, error: '请先配置 API Key' }));
      return;
    }

    // 先检测特定关键词，直接路由到对应模块
    const lower = text.toLowerCase();

    if (lower.includes('天气') || lower.includes('气温') || lower.includes('下雨')) {
      await handleWeather();
      return;
    }
    if (lower.includes('提醒') || lower.includes('定时') || lower.includes('记得')) {
      await handleSetReminder(text);
      return;
    }
    if (lower.includes('打电话') || lower.includes('拨打') || lower.includes('呼叫')) {
      await handleDial(text.replace(/.*(打电话|拨打|呼叫)/, '').replace(/[给]/g, ''));
      return;
    }
    if (lower.includes('新闻') || lower.includes('头条') || lower.includes('热点')) {
      await handleNews(text);
      return;
    }
    if (lower.includes('翻译') || lower.includes('怎么说') || lower.includes('怎么讲')) {
      await handleTranslate(text);
      return;
    }

    try {
      const provider = getProvider();
      const { toolCalls, reply } = await processUserIntent(provider, text, location);

      for (const call of toolCalls) {
        switch (call.name) {
          case 'start_navigation':
            await startNavigation(call.arguments.destination as string);
            break;
          case 'search_nearby':
            await handleSearchNearby(call.arguments.keyword as string);
            break;
          case 'get_weather':
            await handleWeather();
            break;
          case 'set_reminder':
            await handleSetReminder(text);
            break;
          case 'make_call':
            await handleDial(call.arguments.contact as string);
            break;
          case 'search_web':
            await handleNews(call.arguments.query as string);
            break;
          case 'translate':
            await handleTranslate(text);
            break;
          case 'get_location':
            if (location) {
              const addr = await reverseGeocode(settings.amapKey, location);
              speak(`当前位置：${addr.address}`);
            }
            break;
          case 'remember': {
            const key = call.arguments.key as string;
            const value = call.arguments.value as string;
            localStorage.setItem(`memory_${key}`, value);
            speak(`已记住${key}：${value}`);
            break;
          }
          case 'find_parking':
            await handleSearchNearby('停车场');
            break;
        }
      }

      if (reply && toolCalls.length === 0) {
        speak(reply);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI处理失败';
      setState(s => ({ ...s, error: msg }));
      speak('处理失败');
    }
  }, [settings, location, getProvider, startNavigation, handleSearchNearby, handleWeather, handleSetReminder, handleDial, handleNews, handleTranslate, speak]);

  // ============ 直接工具执行 ============

  const executeToolCall = useCallback(async (toolName: string, args: Record<string, string>) => {
    switch (toolName) {
      case 'start_navigation':
        if (args.destination) {
          const lat = args.lat ? Number(args.lat) : undefined;
          const lng = args.lng ? Number(args.lng) : undefined;
          await startNavigation(args.destination, lat && lng ? { lat, lng } : undefined);
        }
        break;
      case 'search_nearby':
        if (args.keyword) await handleSearchNearby(args.keyword);
        break;
      case 'find_parking':
        await handleSearchNearby('停车场');
        break;
      case 'get_weather':
        await handleWeather();
        break;
      case 'set_reminder':
        if (args.text) await handleSetReminder(args.text);
        break;
      case 'make_call':
        if (args.name || args.contact) await handleDial(args.name || args.contact);
        break;
      case 'search_web':
        await handleNews(args.query || '今天的新闻头条');
        break;
      case 'translate':
        if (args.text) await handleTranslate(args.text);
        break;
      case 'get_location':
        if (location && settings.amapKey) {
          try {
            const addr = await reverseGeocode(settings.amapKey, location);
            speak(`当前位置：${addr.address}`);
          } catch { speak('无法获取位置信息'); }
        }
        break;
      default:
        setState(s => ({ ...s, error: `未知工具: ${toolName}` }));
    }
  }, [location, settings.amapKey, startNavigation, handleSearchNearby, handleWeather, handleSetReminder, handleDial, handleNews, handleTranslate, speak]);

  // ============ 导航步进更新 ============

  const lastStepRef = useRef(0);
  useEffect(() => {
    if (state.mode !== 'navigating' || !state.route || !location) return;

    const currentStepData = state.route.steps[state.currentStep];
    if (!currentStepData) return;

    const stepPoints = currentStepData.polyline.split(';').map((p: string) => {
      const [lng, lat] = p.split(',').map(Number);
      return { lng, lat };
    });

    if (stepPoints.length > 0) {
      const lastPoint = stepPoints[stepPoints.length - 1];
      const distToStepEnd = Math.sqrt(
        Math.pow((lastPoint.lat - location.lat) * 111000, 2) +
        Math.pow((lastPoint.lng - location.lng) * 111000 * Math.cos(location.lat * Math.PI / 180), 2)
      );

      if (distToStepEnd < 15 && state.currentStep < state.route.steps.length - 1) {
        const nextStep = state.currentStep + 1;
        if (nextStep !== lastStepRef.current) {
          lastStepRef.current = nextStep;
          setState(s => ({ ...s, currentStep: nextStep }));
          speak(state.route.steps[nextStep].instruction);
        }
      }
    }
  }, [location, state.mode, state.route, state.currentStep, speak]);

  // ============ 回到主页 ============

  const backToIdle = useCallback(() => {
    setState(s => ({ ...s, mode: 'idle', error: null }));
  }, []);

  // ============ 渲染 ============

  switch (state.mode) {
    case 'navigating':
      if (state.route && location) {
        return (
          <NavHUD route={state.route} currentStep={state.currentStep}
            location={location} heading={heading} speaking={speaking} />
        );
      }
      break;

    case 'searching':
      if (state.nearbyPOIs.length > 0) {
        return <POIList pois={state.nearbyPOIs} onSelect={(poi) => startNavigation(poi.name, poi.location)} />;
      }
      break;

    case 'weather':
      if (state.weather) {
        return <WeatherHUD weather={state.weather} airQuality={state.airQuality} location={location} onBack={backToIdle} />;
      }
      break;

    case 'remind':
      return <ReminderHUD reminders={state.reminders} onDismiss={handleDismissReminder} onBack={backToIdle} />;

    case 'dial':
      return <DialHUD contacts={state.contacts} query="" onBack={backToIdle} />;

    case 'news':
      if (state.searchResult) {
        return <NewsHUD searchResult={state.searchResult} onBack={backToIdle} />;
      }
      break;

    case 'translate':
      if (state.translation) {
        return <TranslateHUD translation={state.translation} speaking={speaking} onBack={backToIdle} />;
      }
      break;
  }

  return (
    <IdleScreen
      settings={settings}
      location={location}
      error={state.error}
      onUpdateSettings={updateSettings}
      onQuickSearch={handleSearchNearby}
      onWeather={handleWeather}
      onRemind={() => setState(s => ({ ...s, mode: 'remind' }))}
      onDial={() => setState(s => ({ ...s, mode: 'dial' }))}
      onNews={() => handleNews('今天的新闻头条')}
      onTranslate={(text) => handleTranslate(text)}
    />
  );
}

// ============ 子组件 ============

function POIList({ pois, onSelect }: { pois: POI[]; onSelect: (poi: POI) => void }) {
  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', padding: '12px', gap: '6px', overflow: 'hidden' }}>
      <IdleCorners />
      <div style={{
        fontSize: '11px', color: '#00E5FF', fontFamily: 'monospace',
        letterSpacing: '0.5px', marginBottom: '4px',
        borderBottom: '0.5px solid rgba(0,229,255,0.2)', paddingBottom: '4px',
      }}>POI RESULTS // {pois.length} FOUND</div>
      {pois.slice(0, 6).map((poi, i) => (
        <button key={poi.id} onClick={() => onSelect(poi)} style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', borderRadius: 2,
          background: i === 0 ? 'rgba(0,229,255,0.1)' : 'rgba(0,229,255,0.03)',
          border: i === 0 ? '0.5px solid rgba(0,229,255,0.3)' : '0.5px solid rgba(0,229,255,0.1)',
          cursor: 'pointer', textAlign: 'left', color: '#fff',
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>{poi.name}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {poi.address || poi.type}
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#00E5FF', fontWeight: 600, fontFamily: 'monospace' }}>
            {poi.distance}m
          </div>
        </button>
      ))}
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textAlign: 'center', marginTop: '4px' }}>
        TAP TO NAVIGATE
      </div>
    </div>
  );
}

function IdleScreen({
  settings, location, error, onUpdateSettings, onQuickSearch, onWeather, onRemind, onDial, onNews, onTranslate,
}: {
  settings: Settings;
  location: GeoLocation | null;
  error: string | null;
  onUpdateSettings: (s: Partial<Settings>) => void;
  onQuickSearch: (keyword: string) => void;
  onWeather: () => void;
  onRemind: () => void;
  onDial: () => void;
  onNews: () => void;
  onTranslate: (text: string) => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return (
      <div style={{ position: 'relative', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
        <IdleCorners />
        <div style={{
          fontSize: '14px', fontWeight: 500, color: '#00E5FF',
          fontFamily: 'monospace', letterSpacing: '0.5px',
          borderBottom: '0.5px solid rgba(0,229,255,0.2)', paddingBottom: '4px',
        }}>SYSTEM CONFIG</div>
        <label style={labelStyle}>
          <span style={{ ...spanStyle, fontFamily: 'monospace', color: 'rgba(0,229,255,0.6)' }}>AI PROVIDER</span>
          <select value={settings.providerId} onChange={(e) => onUpdateSettings({ providerId: e.target.value })}
            style={{ ...inputStyle, fontFamily: 'monospace', borderRadius: 2 }}>
            <option value="alibaba">ALIBABA QWEN-MAX</option>
            <option value="openrouter">OPENROUTER GPT-4O</option>
            <option value="azure">AZURE OPENAI</option>
          </select>
        </label>
        <label style={labelStyle}>
          <span style={{ ...spanStyle, fontFamily: 'monospace', color: 'rgba(0,229,255,0.6)' }}>API KEY</span>
          <input type="password" value={settings.apiKey} onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
            placeholder="sk-****************" style={{ ...inputStyle, fontFamily: 'monospace', borderRadius: 2 }} />
        </label>
        <label style={labelStyle}>
          <span style={{ ...spanStyle, fontFamily: 'monospace', color: 'rgba(0,229,255,0.6)' }}>AMAP KEY</span>
          <input type="password" value={settings.amapKey} onChange={(e) => onUpdateSettings({ amapKey: e.target.value })}
            placeholder="amap web api key" style={{ ...inputStyle, fontFamily: 'monospace', borderRadius: 2 }} />
        </label>
        <button onClick={() => setShowSettings(false)} style={{ ...buttonStyle, fontFamily: 'monospace', borderRadius: 2 }}>BACK</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      width: '100%', height: '100%', padding: '16px', gap: '6px', overflow: 'hidden',
    }}>
      <IdleCorners />

      {/* 顶部状态条 */}
      <div style={{
        background: 'rgba(0,229,255,0.08)', border: '0.5px solid rgba(0,229,255,0.25)',
        borderRadius: 2, padding: '2px 12px', position: 'absolute', top: 8,
      }}>
        <span style={{ fontSize: '9px', color: '#00E5FF', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
          AGENT STANDBY // {location ? 'GPS LOCKED' : 'GPS SEARCHING'}
        </span>
      </div>

      {/* 标题 */}
      <div style={{
        fontSize: '20px', fontWeight: 700, color: '#fff',
        textShadow: '0 0 12px rgba(0,229,255,0.6)',
        fontFamily: 'monospace', letterSpacing: '1px', marginTop: '28px',
      }}>
        TurboMeta Agent
      </div>

      {/* GPS 数据块 */}
      {location ? (
        <div style={{ fontSize: '9px', color: 'rgba(0,229,255,0.5)', fontFamily: 'monospace', textAlign: 'center' }}>
          LAT {location.lat.toFixed(3)} // LNG {location.lng.toFixed(3)} // ±{Math.round(location.accuracy || 0)}m
        </div>
      ) : (
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>ACQUIRING GPS...</div>
      )}

      {error && (
        <div style={{ fontSize: '10px', color: '#FF6B6B', fontFamily: 'monospace', textAlign: 'center' }}>{error}</div>
      )}

      {!settings.apiKey && (
        <div style={{
          fontSize: '9px', color: '#FFD700', fontFamily: 'monospace',
          padding: '2px 8px', borderRadius: 2,
          background: 'rgba(255,215,0,0.08)', border: '0.5px solid rgba(255,215,0,0.3)',
        }}>WARN: API KEY NOT SET</div>
      )}

      {/* JARVIS 功能面板 — 两列网格布局 */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '5px', width: '100%', maxWidth: '280px', marginTop: '6px',
      }}>
        <ModuleButton icon="WEATHER" label="天气" color="#FFD700" onClick={onWeather} />
        <ModuleButton icon="REMIND" label="提醒" color="#00E676" onClick={onRemind} />
        <ModuleButton icon="DIAL" label="拨号" color="#5AC8FA" onClick={onDial} />
        <ModuleButton icon="NEWS" label="新闻" color="#FF9500" onClick={onNews} />
        <ModuleButton icon="TRANSLATE" label="翻译" color="#BF5AF2" onClick={() => onTranslate('你好怎么说英语')} />
        <ModuleButton icon="SEARCH" label="导航" color="#00E5FF" onClick={() => onQuickSearch('地铁站')} />
      </div>

      <button onClick={() => setShowSettings(true)} style={{
        marginTop: '4px', padding: '3px 12px', borderRadius: 2,
        background: 'rgba(0,229,255,0.1)', border: '0.5px solid rgba(0,229,255,0.3)',
        color: '#00E5FF', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '0.5px', cursor: 'pointer',
      }}>CONFIG</button>

      <IdleScanBar />
    </div>
  );
}

function ModuleButton({ icon, label, color, onClick }: { icon: string; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '10px 4px', borderRadius: 2, gap: '4px',
      background: `${color}0D`,
      border: `0.5px solid ${color}33`,
      cursor: 'pointer',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: `1px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 8px ${color}22`,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: color, boxShadow: `0 0 6px ${color}`,
        }} />
      </div>
      <span style={{ fontSize: '7px', color: `${color}AA`, fontFamily: 'monospace', letterSpacing: '0.5px' }}>{icon}</span>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{label}</span>
    </button>
  );
}

function IdleCorners() {
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

function IdleScanBar() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, height: '100%', width: '30%',
        background: 'linear-gradient(90deg, transparent, #00E5FF, transparent)',
        animation: 'scanmove 3s linear infinite',
      }} />
      <style>{`@keyframes scanmove { 0%{left:-30%} 100%{left:100%} }`}</style>
    </div>
  );
}

// ============ 样式常量 ============

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const spanStyle: React.CSSProperties = { fontSize: '12px', color: 'rgba(255,255,255,0.6)' };
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: '8px',
  background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff', fontSize: '13px',
};
const buttonStyle: React.CSSProperties = {
  padding: '10px 16px', borderRadius: '10px',
  background: 'rgba(0,229,255,0.2)', border: '1px solid rgba(0,229,255,0.3)',
  color: '#00E5FF', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px',
};
