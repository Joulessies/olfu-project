/**
 * Mock for Node.js 'ws' package
 * React Native has native WebSocket support, so we don't need the Node.js ws package
 * This file provides empty exports to satisfy the bundler
 */

// Export the native WebSocket as the default
module.exports = global.WebSocket || WebSocket;
module.exports.WebSocket = global.WebSocket || WebSocket;
module.exports.WebSocketServer = class WebSocketServer {};
module.exports.createWebSocketStream = () => {};
