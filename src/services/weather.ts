// 天气 + 空气质量服务
// 高德地图 API: https://lbs.amap.com/api/webservice/guide/api/weather

import type { WeatherData, AirQuality, GeoLocation } from '../types';

const AMAP_WEATHER_URL = 'https://restapi.amap.com/v3/weather/weatherInfo';
const AMAP_AIR_URL = 'https://restapi.amap.com/v3/air/station';

// 高德天气类型映射 → 图标代码
const WEATHER_ICON_MAP: Record<string, string> = {
  '晴': 'clear',
  '多云': 'cloudy',
  '阴': 'overcast',
  '小雨': 'rain_light',
  '中雨': 'rain_medium',
  '大雨': 'rain_heavy',
  '暴雨': 'rain_storm',
  '雷阵雨': 'thunderstorm',
  '雪': 'snow',
  '雾': 'fog',
  '霾': 'haze',
  '沙尘': 'dust',
};

export async function getWeather(amapKey: string, location: GeoLocation): Promise<WeatherData> {
  // 先通过逆地理编码获取城市 adcode
  const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${amapKey}&location=${location.lng},${location.lat}&extensions=base`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  if (geoData.status !== '1' || !geoData.regeocode?.addressComponent?.adcode) {
    throw new Error('无法获取城市编码');
  }

  const adcode = geoData.regeocode.addressComponent.adcode;

  // 获取实时天气
  const weatherUrl = `${AMAP_WEATHER_URL}?key=${amapKey}&city=${adcode}&extensions=base&output=JSON`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();

  if (weatherData.status !== '1' || !weatherData.lives?.[0]) {
    throw new Error('天气数据获取失败');
  }

  const live = weatherData.lives[0];
  const conditionCode = WEATHER_ICON_MAP[live.weather] || 'unknown';

  return {
    city: live.province + ' ' + live.city,
    temperature: parseInt(live.temperature, 10),
    condition: live.weather,
    conditionCode,
    humidity: parseInt(live.humidity, 10),
    windPower: live.windpower,
    windDirection: live.winddirection,
    visibility: 0,
    pressure: 0,
    reportTime: live.reporttime,
    tips: undefined,
  };
}

export async function getAirQuality(amapKey: string, location: GeoLocation): Promise<AirQuality | null> {
  try {
    const url = `${AMAP_AIR_URL}?key=${amapKey}&location=${location.lng},${location.lat}&output=JSON`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== '1' || !data.airstatus?.[0]) {
      // 高德空气质量 API 可能不支持所有城市，降级返回 null
      return null;
    }

    const a = data.airstatus[0];
    return {
      aqi: parseInt(a.aqi, 10) || 0,
      pm25: parseFloat(a.pm2_5) || 0,
      pm10: parseFloat(a.pm10) || 0,
      o3: parseFloat(a.o3) || 0,
      no2: parseFloat(a.no2) || 0,
      so2: parseFloat(a.so2) || 0,
      co: parseFloat(a.co) || 0,
      primary: a.primary || '—',
      level: a.level || '',
      category: a.category || '',
    };
  } catch {
    return null;
  }
}

// AQI 等级 → 颜色
export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00E676';   // 优 — 绿色
  if (aqi <= 100) return '#FFD700';  // 良 — 金色
  if (aqi <= 150) return '#FF9500';  // 轻度 — 橙色
  if (aqi <= 200) return '#FF3B30';  // 中度 — 红色
  if (aqi <= 300) return '#AF52DE';  // 重度 — 紫色
  return '#8B0000';                   // 严重 — 暗红
}

export function getAQILevel(aqi: number): string {
  if (aqi <= 50) return 'GOOD';
  if (aqi <= 100) return 'FAIR';
  if (aqi <= 150) return 'MILD';
  if (aqi <= 200) return 'MODERATE';
  if (aqi <= 300) return 'HEAVY';
  return 'SEVERE';
}

// 温度 → 颜色
export function getTempColor(temp: number): string {
  if (temp <= 0) return '#00E5FF';    // 冰冻 — 青色
  if (temp <= 10) return '#5AC8FA';   // 寒冷 — 浅蓝
  if (temp <= 20) return '#34C759';   // 凉爽 — 绿色
  if (temp <= 28) return '#FFD700';   // 温暖 — 金色
  return '#FF3B30';                    // 炎热 — 红色
}
