import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.turbometa.agent',
  appName: 'TurboMeta Agent',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
