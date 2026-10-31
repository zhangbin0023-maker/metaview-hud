// 语音提醒服务
// 管理本地提醒（localStorage 持久化），支持自然语言解析时间

import type { Reminder } from '../types';

const STORAGE_KEY = 'turbometa_reminders';

// 自然语言解析时间
// "3点提醒我开会" → { title: "开会", time: <今天3点的timestamp> }
// "下午5点半提醒我买咖啡" → { title: "买咖啡", time: <今天17:30的timestamp> }
// "明天早上8点提醒我吃药" → { title: "吃药", time: <明天8:00的timestamp> }
// "10分钟后提醒我关火" → { title: "关火", time: <now+10min> }
// "明天下午3点提醒我开会" → { title: "开会", time: <明天15:00的timestamp> }

export interface ParsedReminder {
  title: string;
  time: number; // Unix timestamp (ms)
  relativeDescription: string;
}

export function parseReminder(text: string): ParsedReminder | null {
  const now = new Date();
  let targetTime: Date | null = null;
  let title = '';
  let relativeDesc = '';

  // === 相对时间 ===
  // "X分钟后"
  const minMatch = text.match(/(\d+)\s*分钟[以后之后]/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    targetTime = new Date(now.getTime() + mins * 60 * 1000);
    relativeDesc = `${mins}分钟后`;
    title = text.replace(/.*提醒/, '').replace(/(\d+)\s*分钟[以后之后]/, '').replace(/[我你]/g, '').trim() || '提醒';
    return buildResult(title, targetTime, relativeDesc);
  }

  // "X小时后"
  const hourMatch = text.match(/(\d+)\s*[个小]?时[以后之后]/);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    relativeDesc = `${hours}小时后`;
    title = extractTitle(text, hourMatch[0]);
    return buildResult(title, targetTime, relativeDesc);
  }

  // "X天后"
  const dayMatch = text.match(/(\d+)\s*天[以后之后]/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    targetTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    relativeDesc = `${days}天后`;
    title = extractTitle(text, dayMatch[0]);
    return buildResult(title, targetTime, relativeDesc);
  }

  // === 绝对时间 ===
  let dayOffset = 0;
  if (text.includes('明天') || text.includes('明日')) {
    dayOffset = 1;
    relativeDesc = '明天';
  } else if (text.includes('后天')) {
    dayOffset = 2;
    relativeDesc = '后天';
  } else if (text.includes('今天') || text.includes('今日')) {
    dayOffset = 0;
    relativeDesc = '今天';
  }

  // "下午3点" / "下午3点半" / "15点" / "15:30" / "3点15分"
  let hour = -1;
  let minute = 0;

  // 12小时制
  const pmMatch = text.match(/下午|傍晚|晚上|晚间|夜里/);
  const amMatch = text.match(/早上|早晨|上午|清晨/);
  const timeMatch = text.match(/(\d{1,2})[点点时]?(?::(\d{1,2}))?(?:分)?/) || text.match(/(\d{1,2}):(\d{1,2})/);

  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    if (timeMatch[2]) {
      minute = parseInt(timeMatch[2], 10);
    }

    // "点半" = :30
    if (text.includes('点半')) {
      minute = 30;
    }

    // 处理 12 小时制
    if (pmMatch && hour < 12) {
      hour += 12;
    }
    // "中午12点" 不加12
    if (amMatch && hour === 12) {
      hour = 0;
    }

    targetTime = new Date(now);
    targetTime.setDate(targetTime.getDate() + dayOffset);
    targetTime.setHours(hour, minute, 0, 0);

    if (relativeDesc) {
      relativeDesc += ` ${hour}:${minute.toString().padStart(2, '0')}`;
    } else {
      relativeDesc = `${hour}:${minute.toString().padStart(2, '0')}`;
    }

    title = extractTitle(text, timeMatch[0]);
    return buildResult(title, targetTime, relativeDesc);
  }

  // 无法解析
  return null;
}

function extractTitle(text: string, timePart: string): string {
  // 去掉时间部分和"提醒我"等指令词
  let title = text
    .replace(timePart, '')
    .replace(/(明天|今日|今天|后天|下午|上午|早上|晚上|傍晚|夜里|清晨)/g, '')
    .replace(/(提醒|提示|通知)/g, '')
    .replace(/[我你]/g, '')
    .replace(/[，,。.!！]/g, '')
    .trim();
  return title || '提醒';
}

function buildResult(title: string, time: Date, desc: string): ParsedReminder {
  return {
    title,
    time: time.getTime(),
    relativeDescription: desc,
  };
}

// === 提醒存储管理 ===

export function getReminders(): Reminder[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const list = JSON.parse(saved) as Reminder[];
    // 过滤已过期的（保留5分钟内的作为历史）
    const cutoff = Date.now() - 5 * 60 * 1000;
    return list.filter(r => r.time > cutoff || r.active).sort((a, b) => a.time - b.time);
  } catch {
    return [];
  }
}

export function saveReminder(reminder: Reminder): void {
  const list = getReminders();
  list.push(reminder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteReminder(id: string): void {
  const list = getReminders().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function dismissReminder(id: string): void {
  const list = getReminders();
  const r = list.find(r => r.id === id);
  if (r) {
    r.active = false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

// 检查是否有到期提醒
export function checkDueReminders(): Reminder[] {
  const now = Date.now();
  const list = getReminders();
  return list.filter(r => r.active && r.time <= now);
}

// 格式化时间显示
export function formatReminderTime(timestamp: number): string {
  const diff = timestamp - Date.now();
  const target = new Date(timestamp);

  if (diff < 0) return '已过期';

  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (mins < 1) return '即将提醒';
  if (mins < 60) return `${mins}分钟后`;
  if (hours < 24) return `${hours}小时${mins % 60}分后`;
  if (days < 7) return `${days}天后 ${target.getHours()}:${target.getMinutes().toString().padStart(2, '0')}`;

  return `${target.getMonth() + 1}/${target.getDate()} ${target.getHours()}:${target.getMinutes().toString().padStart(2, '0')}`;
}

// 格式化倒计时
export function formatCountdown(timestamp: number): { text: string; urgent: boolean } {
  const diff = timestamp - Date.now();
  if (diff <= 0) return { text: '00:00', urgent: true };

  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const urgent = diff < 60000; // 1分钟内为紧急

  if (hours > 0) {
    return {
      text: `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      urgent,
    };
  }
  return {
    text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    urgent,
  };
}
