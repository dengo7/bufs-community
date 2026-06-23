import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bufs.thewell',
  appName: 'The Well',
  webDir: 'out',
  server: {
    url: 'https://bufs-community.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
