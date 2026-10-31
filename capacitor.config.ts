import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.metaview.agent',
  appName: 'MetaView',
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
