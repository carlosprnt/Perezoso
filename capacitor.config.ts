import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.perezoso.app',
  appName: 'Perezoso',
  webDir: 'out',

  // In production, load the hosted web app so SSR/API routes keep working.
  // Remove this block to bundle a static export instead.
  server: {
    url: process.env.CAPACITOR_SERVER_URL ?? 'https://perezoso.vercel.app',
    cleartext: false,
  },

  ios: {
    contentInset: 'always',           // Respect safe areas
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#F7F8FA',
  },

  android: {
    backgroundColor: '#F7F8FA',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 0,          // Let the app render immediately
      backgroundColor: '#F7F8FA',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',                 // Push content up when keyboard opens
      style: 'default',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      overlaysWebView: true,          // Draw under status bar (safe-area handles inset)
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
