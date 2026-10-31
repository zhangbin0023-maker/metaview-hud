// 高德地图 API 服务 — POI搜索 / 路线规划 / 逆地理编码

import type { GeoLocation, POI, NavStep } from '../types';

const AMAP_BASE = 'https://restapi.amap.com/v3';

/**
 * POI 周边搜索
 * 文档: https://lbs.amap.com/api/webservice/guide/api/search
 */
export async function searchNearby(
  apiKey: string,
  location: GeoLocation,
  keyword: string,
  radius = 1000
): Promise<POI[]> {
  const url = `${AMAP_BASE}/place/around?key=${apiKey}&location=${location.lng},${location.lat}&keywords=${encodeURIComponent(keyword)}&radius=${radius}&offset=10&extensions=all`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== '1') {
    throw new Error(`高德POI搜索失败: ${data.info}`);
  }

  return (data.pois || []).map((poi: Record<string, unknown>): POI => {
    const [lng, lat] = (poi.location as string).split(',').map(Number);
    const distance = poi.distance ? parseInt(poi.distance as string, 10) : 0;
    return {
      id: poi.id as string,
      name: poi.name as string,
      type: poi.type as string,
      address: poi.address as string,
      location: { lat, lng },
      distance,
      tel: poi.tel as string,
    };
  });
}

/**
 * 步行路线规划
 * 文档: https://lbs.amap.com/api/webservice/guide/api/direction
 */
export async function planWalkingRoute(
  apiKey: string,
  origin: GeoLocation,
  destination: GeoLocation
): Promise<{ distance: number; duration: number; steps: NavStep[]; polyline: string }> {
  const url = `${AMAP_BASE}/direction/walking?key=${apiKey}&origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== '1' || !data.route) {
    throw new Error(`高德路线规划失败: ${data.info}`);
  }

  const path = data.route.paths[0];
  const steps: NavStep[] = (path.steps || []).map((step: Record<string, unknown>): NavStep => ({
    instruction: step.instruction as string,
    distance: parseInt(step.distance as string, 10),
    action: parseAction(step.instruction as string),
    polyline: step.polyline as string,
  }));

  return {
    distance: parseInt(path.distance as string, 10),
    duration: Math.ceil(parseInt(path.duration as string, 10) / 60),
    steps,
    polyline: steps.map((s: NavStep) => s.polyline).join(';'),
  };
}

/**
 * 逆地理编码 — 坐标转地址
 */
export async function reverseGeocode(
  apiKey: string,
  location: GeoLocation
): Promise<{ address: string; province: string; city: string; district: string }> {
  const url = `${AMAP_BASE}/geocode/regeo?key=${apiKey}&location=${location.lng},${location.lat}&extensions=base`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== '1') {
    throw new Error(`逆地理编码失败: ${data.info}`);
  }

  const addr = data.regeocode;
  return {
    address: addr.formatted_address as string,
    province: addr.addressComponent.province as string,
    city: addr.addressComponent.city as string,
    district: addr.addressComponent.district as string,
  };
}

/**
 * 解析高德导航指令中的动作类型
 */
function parseAction(instruction: string): string {
  if (instruction.includes('左转')) return 'left';
  if (instruction.includes('右转')) return 'right';
  if (instruction.includes('到达')) return 'arrive';
  if (instruction.includes('直行') || instruction.includes('向前')) return 'straight';
  if (instruction.includes('掉头')) return 'uturn';
  return 'straight';
}

/**
 * 解码高德坐标串（格式: lng,lat;lng,lat;...）
 */
export function decodePolyline(polyline: string): GeoLocation[] {
  return polyline.split(';').map((point: string) => {
    const [lng, lat] = point.split(',').map(Number);
    return { lng, lat };
  });
}

/**
 * 计算两点间距离（Haversine公式，米）
 */
export function calculateDistance(p1: GeoLocation, p2: GeoLocation): number {
  const R = 6371000; // 地球半径(米)
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) * Math.cos((p2.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 计算从当前位置到目标点的方位角（0-360，0=正北）
 */
export function calculateBearing(from: GeoLocation, to: GeoLocation): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}
