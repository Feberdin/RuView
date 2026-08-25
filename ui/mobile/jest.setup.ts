jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-wifi-reborn', () => ({
  loadWifiList: jest.fn(async () => []),
}));

// Reanimated 4 delegates its runtime primitives to react-native-worklets.
// Mock that native boundary first so the public Reanimated mock can load.
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock')
);

jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock')
);

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockWebView = (props: unknown) => React.createElement(View, props);

  return {
    __esModule: true,
    default: MockWebView,
    WebView: MockWebView,
  };
});
