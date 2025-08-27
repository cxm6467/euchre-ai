const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Event listeners
  onNewGame: (callback) => ipcRenderer.on('new-game', callback),
  onDifficultyChanged: (callback) => ipcRenderer.on('difficulty-changed', (event, difficulty) => callback(difficulty)),
  onStatsReset: (callback) => ipcRenderer.on('stats-reset', callback),
  
  // Platform info
  platform: process.platform
});
