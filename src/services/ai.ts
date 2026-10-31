// AI 意图解析服务 — 支持 GPT-4o / Qwen-Max / Claude (OpenAI 兼容格式)

import type { AIProvider, ToolDefinition, ToolCall, GeoLocation } from '../types';

/**
 * 工具定义列表 — 所有可用工具
 */
export const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'start_navigation',
      description: '搜索目的地并开始步行导航，在HUD上显示方向箭头和距离',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: '目的地名称，如"地铁站"、"星巴克"、"天安门"',
          },
        },
        required: ['destination'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_nearby',
      description: '搜索周边POI（餐厅、地铁站、停车场等）',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: '搜索关键词，如"餐厅"、"咖啡"、"停车场"',
          },
          radius: {
            type: 'number',
            description: '搜索半径(米)，默认1000',
          },
        },
        required: ['keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_location',
      description: '获取当前位置信息和周边地址',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remember',
      description: '记住用户的偏好信息，下次对话时自动使用',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: '偏好类型，如"饮食偏好"、"导航方式"',
          },
          value: {
            type: 'string',
            description: '偏好内容',
          },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_parking',
      description: '搜索附近的停车场',
      parameters: {
        type: 'object',
        properties: {
          radius: { type: 'number', description: '搜索半径(米)，默认500' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '获取当前位置的实时天气和空气质量，显示在HUD上',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: '设置语音提醒。支持自然语言时间，如"3点"、"下午5点半"、"10分钟后"、"明天8点"',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '用户原始提醒指令，包含时间和内容' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'make_call',
      description: '搜索联系人并拨打电话',
      parameters: {
        type: 'object',
        properties: {
          contact: { type: 'string', description: '联系人姓名' },
        },
        required: ['contact'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: '搜索网页或获取新闻摘要，AI返回结果摘要显示在HUD上',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词或新闻请求' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'translate',
      description: '翻译文本到指定语言。自动检测源语言。',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要翻译的文本（包含目标语言提示）' },
        },
        required: ['text'],
      },
    },
  },
];

/**
 * 调用 AI 模型解析用户意图（function calling）
 * 支持: 阿里云 Qwen-Max / OpenRouter GPT-4o / Azure OpenAI
 * 全部使用 OpenAI 兼容的 /chat/completions 格式
 */
export async function processUserIntent(
  provider: AIProvider,
  text: string,
  location: GeoLocation | null
): Promise<{ toolCalls: ToolCall[]; reply: string }> {
  const systemPrompt = buildSystemPrompt(location);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider.apiKey}`,
    'Content-Type': 'application/json',
  };

  // OpenRouter 需要额外头
  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://metaview.app';
    headers['X-Title'] = 'MetaView HUD';
  }

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    tools: TOOLS,
    tool_choice: 'auto',
    max_tokens: 1000,
    temperature: 0.3,
  };

  const response = await fetch(`${provider.baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI请求失败 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  const toolCalls: ToolCall[] = [];
  if (message.tool_calls) {
    for (const call of message.tool_calls) {
      toolCalls.push({
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments),
      });
    }
  }

  const reply = message.content || '';
  return { toolCalls, reply };
}

/**
 * 图像识别 — Qwen-VL-Max / GPT-4o vision
 */
export async function analyzeImage(
  provider: AIProvider,
  base64Image: string,
  prompt: string
): Promise<string> {
  const model = provider.visionModel || provider.model;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${provider.apiKey}`,
    'Content-Type': 'application/json',
  };

  if (provider.id === 'openrouter') {
    headers['HTTP-Referer'] = 'https://metaview.app';
    headers['X-Title'] = 'MetaView HUD';
  }

  const response = await fetch(`${provider.baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`图像识别失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(location: GeoLocation | null): string {
  const locStr = location
    ? `用户当前位置：纬度${location.lat.toFixed(6)}，经度${location.lng.toFixed(6)}`
    : '用户位置未知';

  return `你是 MetaView 智能眼镜助手，运行在 Ray-Ban Meta Display 眼镜的 HUD 上。
${locStr}。
当前时间：${new Date().toLocaleString('zh-CN')}。

你的职责：
1. 根据用户语音请求，选择合适的工具调用
2. 工具调用结果会自动执行并显示在眼镜HUD上
3. 用简短的中文回复（用户在看HUD，语音只需一句话）

可用工具：
- start_navigation: 导航到目的地
- search_nearby: 搜索周边POI
- get_location: 获取当前位置
- find_parking: 搜索停车场
- get_weather: 获取实时天气和空气质量
- set_reminder: 设置语音提醒（支持自然语言时间）
- make_call: 搜索联系人并拨打电话
- search_web: 搜索网页或获取新闻
- translate: 翻译文本到其他语言
- remember: 记住偏好

规则：
- 优先调用工具而非纯文字回复
- 如果用户意图不明确，调用最接近的工具
- 回复保持一句话，不要长篇大论`;
}
