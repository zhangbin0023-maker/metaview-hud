// 新闻 + 网页搜索服务
// 使用 AI 模型进行搜索摘要，无需额外 API Key

import type { AIProvider, NewsItem, SearchResult } from '../types';

// 使用 AI 模型生成新闻摘要（模型内部知识 + 联网能力）
// Qwen-Max 和 GPT-4o 都有联网搜索能力

export async function searchWeb(
  provider: AIProvider,
  query: string,
  _location?: { lat: number; lng: number } | null
): Promise<SearchResult> {
  const baseURL = provider.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const url = `${baseURL}/chat/completions`;

  // 检查是否是新闻请求
  const isNews = query.includes('新闻') || query.includes('头条') || query.includes('热点') || query.includes('news');

  const systemPrompt = isNews
    ? `You are an AI news assistant. When asked about news, provide the latest relevant news items you know about.
Return results as JSON in this exact format:
{
  "summary": "AI generated summary of the top news (2-3 sentences in Chinese)",
  "items": [
    {"title": "news title in Chinese", "summary": "brief summary in Chinese", "source": "source name", "category": "category"},
    ...
  ]
}
Provide 3-5 items. If you don't have real-time data, note it in the summary but still provide the most relevant recent news you know about.`
    : `You are an AI search assistant. Search for the user's query and provide relevant results.
Return results as JSON in this exact format:
{
  "summary": "AI generated answer to the query (2-3 sentences in Chinese)",
  "items": [
    {"title": "result title in Chinese", "summary": "relevant snippet in Chinese", "source": "source name", "category": "category"},
    ...
  ]
}
Provide 3-5 results.`;

  const userMsg = isNews ? `今天的新闻${query.includes('头条') ? '头条' : ''}` : query;

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
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    throw new Error(`搜索请求失败: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  let parsed: { summary?: string; items?: Array<{ title: string; summary: string; source: string; category: string }> };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { summary: content, items: [] };
  }

  const newsItems: NewsItem[] = (parsed.items || []).map((item, i) => ({
    id: `news_${Date.now()}_${i}`,
    title: item.title,
    summary: item.summary,
    source: item.source || 'AI',
    url: '',
    publishedAt: Date.now(),
    category: item.category || 'general',
  }));

  return {
    query,
    results: newsItems.map(n => ({
      title: n.title,
      snippet: n.summary,
      url: n.url,
      source: n.source,
    })),
    aiSummary: parsed.summary || '暂无摘要',
  };
}

// 快捷查询预设
export const QUICK_QUERIES = [
  { label: 'TODAY HEADLINES', sub: '今日头条', query: '今天的新闻头条' },
  { label: 'TECH NEWS', sub: '科技新闻', query: '最新科技新闻' },
  { label: 'WEATHER ALERT', sub: '天气预警', query: '今日天气预警' },
];
