# MetaView HUD

> Ray-Ban Meta Display 智能体助手 — JARVIS 风格多模块 HUD

## 功能模块

| 模块 | 描述 | 技术 |
|------|------|------|
| 导航 | 实时步行导航 + 雷达箭头 | 高德地图 API + Canvas |
| 天气 | 实时天气 + 空气质量 | 高德天气 API + AQI |
| 提醒 | 语音提醒 + 倒计时 | 自然语言解析 + localStorage |
| 拨号 | 联系人匹配 + 一键拨号 | 模糊匹配 + tel: 协议 |
| 新闻 | AI 摘要 + 数据流 | Qwen-Max / GPT-4o |
| 翻译 | 13种语言实时翻译 | AI JSON 模式 |

## 快速开始

### Web 开发
```bash
npm install
npm run dev
```

### 构建
```bash
npm run build
npm run preview
```

### 打包 Android APK

#### 自动脚本
```bash
# Windows
scripts\build-apk.bat

# Linux/Mac
./scripts/build-apk.sh
```

#### 手动步骤
```bash
# 1. 构建 Web 资源
npm run build

# 2. 同步到 Android
npx cap sync android

# 3. 构建 APK
cd android
./gradlew assembleDebug

# 4. 安装到设备
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 在线部署 (Vercel)
```bash
npx vercel deploy --prod
```

## 技术栈

- **前端**: React 18 + TypeScript + Vite 6
- **地图**: 高德地图 Web API
- **AI**: Qwen-Max / GPT-4o (OpenAI 兼容格式)
- **原生打包**: Capacitor 7
- **Android**: compileSdk 36, minSdk 24

## 项目结构

```
metaview-hud/
├── src/
│   ├── App.tsx              # 主应用状态机
│   ├── types.ts             # 类型定义
│   ├── components/           # HUD 组件
│   │   ├── NavHUD.tsx       # 导航 HUD
│   │   ├── WeatherHUD.tsx   # 天气 HUD
│   │   ├── ReminderHUD.tsx  # 提醒 HUD
│   │   ├── DialHUD.tsx      # 拨号 HUD
│   │   ├── NewsHUD.tsx      # 新闻 HUD
│   │   └── TranslateHUD.tsx # 翻译 HUD
│   ├── services/            # 业务逻辑
│   │   ├── amap.ts          # 高德地图
│   │   ├── weather.ts       # 天气服务
│   │   ├── reminder.ts      # 提醒服务
│   │   ├── contacts.ts      # 联系人
│   │   ├── news.ts          # 新闻搜索
│   │   ├── translate.ts     # 翻译
│   │   └── ai.ts            # AI 意图解析
│   └── hooks/
│       └── device.ts        # 设备能力 (GPS/传感器/TTS)
├── android/                  # Capacitor Android 项目
├── scripts/                  # 构建脚本
├── capacitor.config.ts       # Capacitor 配置
└── vite.config.ts            # Vite 配置
```

## 权限说明

| 权限 | 用途 |
|------|------|
| INTERNET | 地图API/AI对话 |
| ACCESS_FINE_LOCATION | GPS导航 |
| CALL_PHONE | 语音拨号 |
| READ_CONTACTS | 联系人匹配 |
| VIBRATE | 提醒震动 |
| KEEP_SCREEN_ON | HUD常亮 |

## 配置

在 App 设置页面配置：
- 高德地图 API Key
- AI Provider (Qwen-Max / GPT-4o / Azure OpenAI)
- API Key
- TTS 开关

## License

MIT
