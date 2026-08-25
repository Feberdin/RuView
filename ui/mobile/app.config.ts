// Purpose: Define the single canonical Expo application configuration.
// Input: Static, non-secret project metadata and bundled image assets.
// Output: iOS, Android, and web build metadata consumed by Expo tooling.
// Invariants/debugging: Keep secrets out of this file; inspect the resolved
// configuration with `npx expo config --type public`.
export default {
  name: 'WiFi-DensePose',
  slug: 'wifi-densepose',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    bundleIdentifier: 'com.ruvnet.wifidensepose',
    supportsTablet: true,
  },
  android: {
    package: 'com.ruvnet.wifidensepose',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-font'],
};
