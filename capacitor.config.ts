import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairos.app',
  appName: 'Kairos',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#faf8ff',
    allowMixedContent: true
  }
};

export default config;
