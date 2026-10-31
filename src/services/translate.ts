// 实时翻译服务
// 使用 AI 模型（Qwen-Max / GPT-4o）进行翻译，支持多语言

import type { AIProvider, TranslationResult } from '../types';

const LANG_MAP: Record<string, { name: string; code: string }> = {
  '中文': { name: 'Chinese', code: 'zh' },
  '英语': { name: 'English', code: 'en' },
  '日语': { name: 'Japanese', code: 'ja' },
  '韩语': { name: 'Korean', code: 'ko' },
  '法语': { name: 'French', code: 'fr' },
  '德语': { name: 'German', code: 'de' },
  '西班牙语': { name: 'Spanish', code: 'es' },
  '俄语': { name: 'Russian', code: 'ru' },
  '阿拉伯语': { name: 'Arabic', code: 'ar' },
  '葡萄牙语': { name: 'Portuguese', code: 'pt' },
  '意大利语': { name: 'Italian', code: 'it' },
  '泰语': { name: 'Thai', code: 'th' },
  '越南语': { name: 'Vietnamese', code: 'vi' },
};

export function detectTargetLang(text: string): string {
  // 检测用户想翻译到什么语言
  for (const [keyword, info] of Object.entries(LANG_MAP)) {
    if (text.includes(keyword)) {
      return info.code;
    }
  }
  return 'en'; // 默认英语
}

export function parseSourceText(text: string): { sourceText: string; targetLang: string } {
  // "这句话日语怎么说：你好" → sourceText="你好", targetLang="ja"
  // "把'你好'翻译成英语" → sourceText="你好", targetLang="en"

  let targetLang = detectTargetLang(text);
  let sourceText = text;

  // 去除指令前缀
  const patterns = [
    /[把将].*[翻译译成]为?[^：:]+[：:]?\s*/,
    /[这那]个?.*[怎么说怎么讲][：:]?\s*/,
    /翻译[为成到]?[^：:]+[：:]?\s*/,
    /.*怎么说[：:]?\s*/,
    /.*怎么讲[：:]?\s*/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      sourceText = text.replace(m[0], '').trim();
      break;
    }
  }

  // 如果有引号，取引号内的内容
  const quoted = sourceText.match(/[""''「」『』]+([^""''「」『』]+)[""''「」『』]+/);
  if (quoted) {
    sourceText = quoted[1];
  }

  return { sourceText, targetLang };
}

export async function translateText(
  provider: AIProvider,
  text: string,
  targetLangCode?: string
): Promise<TranslationResult> {
  const { sourceText, targetLang } = parseSourceText(text);
  const finalTargetLang = targetLangCode || targetLang;

  const langName = Object.entries(LANG_MAP).find(([_, info]) => info.code === finalTargetLang)?.[0] || 'English';

  const systemPrompt = `You are a professional translator. Translate the user's text into ${langName}. 
Return ONLY the translation in this JSON format:
{"translation": "translated text", "pronunciation": "pronunciation guide if applicable", "detectedLang": "source language name in English"}`;

  const userMsg = `Translate this: "${sourceText}"`;

  const baseURL = provider.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const url = `${baseURL}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
      ...(provider.id === 'openrouter' ? { 'HTTP-Referer': 'https://metaview.local' } : {}),
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`翻译请求失败: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  let parsed: { translation?: string; pronunciation?: string; detectedLang?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    // 如果不是 JSON，直接取 content 作为翻译结果
    parsed = { translation: content };
  }

  if (!parsed.translation) {
    throw new Error('翻译结果为空');
  }

  return {
    sourceText,
    sourceLang: parsed.detectedLang || 'auto',
    targetText: parsed.translation,
    targetLang: langName,
    detectedLang: parsed.detectedLang || 'Unknown',
    pronunciation: parsed.pronunciation,
  };
}
