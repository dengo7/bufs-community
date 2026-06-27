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
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
