// 设备能力 Hook — GPS 定位 + 方向传感器 + TTS

import { useEffect, useRef, useState, useCallback } from 'react';
import type { GeoLocation } from '../types';

/**
 * GPS 定位 Hook
 * 使用 navigator.geolocation 从配对手机获取位置
 */
export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setError('设备不支持定位');
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        setLocation({
          lat: latitude,
          lng: longitude,
          accuracy: accuracy ?? undefined,
          heading: heading ?? null,
          speed: speed ?? null,
        });
        setError(null);
      },
      (err) => {
        setError(getLocationErrorMessage(err));
      },
      { enableHighAccuracy: true }
    );
    setWatching(true);
  }, []);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  }, []);

  useEffect(() => () => stopWatch(), [stopWatch]);

  return { location, error, watching, startWatch, stopWatch };
}

function getLocationErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return '定位权限被拒绝';
    case err.POSITION_UNAVAILABLE:
      return '无法获取位置（请检查手机连接）';
    case err.TIMEOUT:
      return '定位超时';
    default:
      return '定位失败';
  }
}

/**
 * 方向传感器 Hook
 * 使用 DeviceOrientationEvent 获取头部朝向
 */
export function useHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    // alpha: 0-360 (绕Z轴旋转，0=正北)
    // 需要使用 absolute 事件获取绝对方向
    if (event.alpha !== null && event.alpha !== undefined) {
      setHeading(event.alpha);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    // iOS 13+ 需要请求权限
    const DeviceOrientation = window.DeviceOrientationEvent;
    if (!DeviceOrientation) {
      setSupported(false);
      setErr('设备不支持方向传感器');
      return false;
    }

    if (typeof (DeviceOrientation as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
      try {
        const state = await (DeviceOrientation as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (state !== 'granted') {
          setErr('方向传感器权限被拒绝');
          return false;
        }
      } catch {
        setErr('方向传感器不可用');
        return false;
      }
    }

    setHasPermission(true);
    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('deviceorientationabsolute', handleOrientation);
    return true;
  }, [handleOrientation]);

  const stop = useCallback(() => {
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    setHasPermission(false);
  }, [handleOrientation]);

  useEffect(() => () => stop(), [stop]);

  return { heading, hasPermission, supported, error, requestPermission, stop };
}

/**
 * TTS 语音播报 Hook
 * 使用 speechSynthesis API（眼镜内置 Chromium 原生支持）
 */
export function useTTS(enabled: boolean) {
  const speakingRef = useRef(false);
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!enabled) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      return;
    }

    // 取消当前播报
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
    };
    utterance.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };

    speechSynthesis.speak(utterance);
  }, [enabled]);

  const cancel = useCallback(() => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { speak, cancel, speaking };
}

/**
 * 电量监控 Hook
 */
export function useBattery() {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    if (!nav.getBattery) return;

    let battery: BatteryManagerLike | null = null;

    nav.getBattery().then((b: BatteryManagerLike) => {
      battery = b;
      setLevel(b.level);
      setCharging(b.charging);

      b.addEventListener('levelchange', () => setLevel(battery?.level ?? null));
      b.addEventListener('chargingchange', () => setCharging(battery?.charging ?? false));
    });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', () => setLevel(battery?.level ?? null));
        battery.removeEventListener('chargingchange', () => setCharging(battery?.charging ?? false));
      }
    };
  }, []);

  return { level, charging };
}

interface BatteryManagerLike extends EventTarget {
  level: number;
  charging: boolean;
}
