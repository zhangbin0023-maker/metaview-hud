// MetaView HUD — 类型定义

// ============ AI Provider ============

export interface AIProvider {
  id: string;
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
  visionModel?: string;
}

export const PROVIDERS: Record<string, Omit<AIProvider, 'apiKey'>> = {
  alibaba: {
    id: 'alibaba',
    name: '阿里云通义千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-max',
    visionModel: 'qwen-vl-max',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter (GPT-4o/Claude)',
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o',
    visionModel: 'openai/gpt-4o',
  },
  azure: {
    id: 'azure',
    name: 'Azure OpenAI (GPT-4o)',
    baseURL: '', // 用户自行配置 Azure endpoint
    model: 'gpt-4o',
    visionModel: 'gpt-4o',
  },
};

// ============ 地图 & 导航 ============

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number | null;
  speed?: number | null;
}

export interface POI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: GeoLocation;
  distance: number; // 米
  duration?: number; // 步行分钟
  tel?: string;
  rating?: number;
}

export interface NavStep {
  instruction: string; // "前方50米右转"
  distance: number; // 米
  action: string; // "straight" | "left" | "right" | "arrive"
  polyline: string; // 高德编码坐标串
}

export interface NavRoute {
  origin: GeoLocation;
  destination: POI;
  distance: number; // 总距离(米)
  duration: number; // 总时间(分钟)
  steps: NavStep[];
  polyline: string; // 完整路线编码坐标
}

// ============ 意图 & 工具调用 ============

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
      }>;
      required: string[];
    };
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface IntentResult {
  toolCalls: ToolCall[];
  text?: string;
}

// ============ App 状态 ============

export type AppMode = 'idle' | 'navigating' | 'searching' | 'describing'
  | 'weather' | 'remind' | 'dial' | 'news' | 'translate';

// ============ 天气数据 ============

export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  conditionCode: string;
  humidity: number;
  windPower: string;
  windDirection: string;
  visibility: number;
  pressure: number;
  reportTime: string;
  tips?: string;
}

export interface AirQuality {
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  primary: string;
  level: string;
  category: string;
}

// ============ 提醒 ============

export interface Reminder {
  id: string;
  title: string;
  time: number; // Unix timestamp
  active: boolean;
  createdAt: number;
}

// ============ 联系人 ============

export interface Contact {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  matched: number; // 匹配置信度 0-1
}

// ============ 新闻 ============

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: number;
  category: string;
}

export interface SearchResult {
  query: string;
  results: { title: string; snippet: string; url: string; source: string }[];
  aiSummary: string;
}

// ============ 翻译 ============

export interface TranslationResult {
  sourceText: string;
  sourceLang: string;
  targetText: string;
  targetLang: string;
  detectedLang: string;
  pronunciation?: string;
}

export interface AppState {
  mode: AppMode;
  location: GeoLocation | null;
  heading: number | null; // 0-360, 0=北
  route: NavRoute | null;
  currentStep: number;
  nearbyPOIs: POI[];
  weather: WeatherData | null;
  airQuality: AirQuality | null;
  reminders: Reminder[];
  contacts: Contact[];
  newsItems: NewsItem[];
  searchResult: SearchResult | null;
  translation: TranslationResult | null;
  error: string | null;
  speaking: boolean;
}

// ============ 设置 ============

export interface Settings {
  providerId: string;
  apiKey: string;
  amapKey: string; // 高德地图 API Key
  azureEndpoint?: string; // Azure OpenAI endpoint
  language: 'zh-CN' | 'en-US';
  ttsEnabled: boolean;
  proactiveEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  providerId: 'alibaba',
  apiKey: '',
  amapKey: '',
  language: 'zh-CN',
  ttsEnabled: true,
  proactiveEnabled: true,
};
