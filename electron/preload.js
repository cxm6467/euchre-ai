const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure communication between main and renderer processes
 * Exposes safe APIs to the web content without giving access to Node.js
 */

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings management
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Game events
  onNewGame: (callback) => {
    const subscription = (event, ...args) => callback(...args);
    ipcRenderer.on('new-game', subscription);
    return () => ipcRenderer.removeListener('new-game', subscription);
  },
  
  onDifficultyChanged: (callback) => {
    const subscription = (event, difficulty) => callback(difficulty);
    ipcRenderer.on('difficulty-changed', subscription);
    return () => ipcRenderer.removeListener('difficulty-changed', subscription);
  },
  
  // App info
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform,
  
  // Future API extensions can be added here safely
});