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
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    PushNotifications: {
      // 앱이 켜져 있을 때(포그라운드)도 배너·소리·배지로 표시
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
