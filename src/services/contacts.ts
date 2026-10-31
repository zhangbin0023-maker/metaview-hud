// 语音拨号服务
// 从 TurboMeta APP 通过 URL 参数传入联系人信息，或使用本地模拟数据

import type { Contact } from '../types';

// 模拟联系人数据库（实际使用时从 URL 参数或 APP 传入）
const DEMO_CONTACTS: Contact[] = [
  { id: '1', name: '张三', phone: '138****8888', matched: 0.9 },
  { id: '2', name: '李四', phone: '139****6666', matched: 0.7 },
  { id: '3', name: '王五', phone: '137****3333', matched: 0.6 },
];

// 从 URL 参数匹配联系人
export function matchContact(query: string): Contact[] {
  const contacts = getContacts();
  if (!query) return [];

  const lower = query.toLowerCase().trim();

  // 精确匹配
  const exact = contacts.filter(c => c.name === query);
  if (exact.length > 0) {
    return exact.map(c => ({ ...c, matched: 1.0 }));
  }

  // 模糊匹配
  const fuzzy = contacts
    .filter(c => c.name.includes(lower) || lower.includes(c.name))
    .map(c => ({
      ...c,
      matched: calculateSimilarity(lower, c.name),
    }))
    .sort((a, b) => b.matched - a.matched);

  if (fuzzy.length > 0) return fuzzy;

  // 如果没有匹配，返回空（在实际 APP 中，可以传入选定的联系人）
  return [];
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.85;
  // 简单的字符重叠
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  return intersection.size / Math.max(setA.size, setB.size) * 0.7;
}

export function getContacts(): Contact[] {
  // 尝试从 localStorage 加载
  const saved = localStorage.getItem('turbometa_contacts');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // 降级
    }
  }
  return DEMO_CONTACTS;
}

export function saveContacts(contacts: Contact[]): void {
  localStorage.setItem('turbometa_contacts', JSON.stringify(contacts));
}

// 在 Ray-Ban Meta Display 眼镜上，拨号通过 Deep Link 回传给手机
export function initiateCall(phone: string): void {
  // 在实际场景中，通过 Custom Tabs Intent 或 Deep Link 传回手机拨号
  // 这里记录意图，HUD 展示拨号动画
  console.log('[DIAL] Initiating call to:', phone);

  // 尝试 tel: 协议（在眼镜浏览器中可能不支持，但 APP 可以拦截）
  try {
    window.location.href = `tel:${phone}`;
  } catch {
    // 降级：通过 postMessage 通知 APP
    window.postMessage({ type: 'dial', phone }, '*');
  }
}
