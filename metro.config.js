// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

// Path to our mocks
const wsMockPath = path.resolve(__dirname, "ws-mock.js");
const webviewStubPath = path.resolve(__dirname, "webview-stub.js");

// Polyfill/mock Node.js modules for React Native
config.resolver.extraNodeModules = {
  // Polyfills
  stream: require.resolve("readable-stream"),
  events: require.resolve("events"),
  buffer: require.resolve("buffer"),
  // Mock ws - React Native has native WebSocket
  ws: wsMockPath,
  // Mock other Node.js modules that ws depends on
  http: wsMockPath,
  https: wsMockPath,
  net: wsMockPath,
  tls: wsMockPath,
  crypto: wsMockPath,
  zlib: wsMockPath,
};

// Custom resolver for modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web platform, redirect react-native-webview to our stub
  // Check multiple ways the platform might be identified
  const isWeb = platform === "web" || process.env.EXPO_PUBLIC_PLATFORM === "web";
  
  if (isWeb && (moduleName === "react-native-webview" || moduleName.startsWith("react-native-webview/"))) {
    return {
      filePath: webviewStubPath,
      type: "sourceFile",
    };
  }

  // Redirect Node.js built-ins to mocks/polyfills
  const nodeModules = ["http", "https", "net", "tls", "zlib", "crypto"];

  if (nodeModules.includes(moduleName)) {
    return {
      filePath: wsMockPath,
      type: "sourceFile",
    };
  }

  // Redirect ws package to our mock
  if (moduleName === "ws" || moduleName.startsWith("ws/")) {
    return {
      filePath: wsMockPath,
      type: "sourceFile",
    };
  }

  // Redirect stream to readable-stream
  if (moduleName === "stream") {
    return {
      filePath: require.resolve("readable-stream"),
      type: "sourceFile",
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
