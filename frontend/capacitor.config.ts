import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.virtualgm.app',
  appName: 'Virtual GM',
  webDir: 'dist',
  // Development server configuration for live reload
  server: {
    // Uncomment and set to your local IP for physical device testing
    // url: 'http://192.168.1.xxx:5173',
    // cleartext: true, // Required for Android to allow HTTP connections
  },
};

export default config;
