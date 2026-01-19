/**
 * Stub for react-native-webview on web platform
 * This file is used as an alias when building for web
 * 
 * IMPORTANT: This must match the export structure of react-native-webview
 */

// Stub WebView component - never actually renders on web since we use iframe
const WebView = () => null;

// Match the export structure of react-native-webview
module.exports = {
  WebView,
  default: WebView,
};

// Also export as named export for ES modules
module.exports.WebView = WebView;
