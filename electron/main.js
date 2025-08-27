const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { inject } = require('@vercel/analytics');

/**
 * Euchre Game - Main Electron Process
 * Handles window management, menu creation, and analytics integration
 */

// Configuration
const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
const isWin = process.platform === 'win32';

const store = new Store({
  name: 'euchre-settings',
  defaults: {
    settings: {
      difficulty: 'medium',
      soundEnabled: true,
      animationSpeed: 'normal'
    }
  }
});

let mainWindow;
let serverProcess;

/**
 * Start local Express server for production builds
 * @function startLocalServer
 */
function startLocalServer() {
  if (!isDev) {
    const { spawn } = require('child_process');
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      shell: isWin
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
    });
  }
}

/**
 * Create the main application window with Vercel Analytics integration
 * @function createWindow
 */
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '..', 'assets', isWin ? 'icon.ico' : 'icon.png'),
    title: 'Euchre',
    backgroundColor: '#667eea',
    show: false
  });

  // Load the game
  if (isDev) {
    // Check if VITE_DEV_SERVER_URL is set (for future Vite integration)
    const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:8080';
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // Load from public directory for current setup
    mainWindow.loadFile(path.join(__dirname, '..', 'public', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Inject Vercel Analytics
    inject();
  });

  // Create application menu
  createMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

/**
 * Create application menu with game controls and settings
 * @function createMenu
 */
function createMenu() {
  const template = [
    {
      label: 'Game',
      submenu: [
        {
          label: 'New Game',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-game');
          }
        },
        {
          label: 'Statistics',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            showStats();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: isWin ? 'Alt+F4' : 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools', visible: isDev },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Difficulty',
          submenu: [
            {
              label: 'Easy',
              type: 'radio',
              checked: store.get('settings.difficulty') === 'easy',
              click: () => updateDifficulty('easy')
            },
            {
              label: 'Medium',
              type: 'radio',
              checked: store.get('settings.difficulty') === 'medium',
              click: () => updateDifficulty('medium')
            },
            {
              label: 'Hard',
              type: 'radio',
              checked: store.get('settings.difficulty') === 'hard',
              click: () => updateDifficulty('hard')
            },
            {
              label: 'Expert',
              type: 'radio',
              checked: store.get('settings.difficulty') === 'expert',
              click: () => updateDifficulty('expert')
            }
          ]
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'How to Play',
          click: () => {
            shell.openExternal('https://bicyclecards.com/how-to-play/euchre');
          }
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Euchre',
              message: 'Euchre Game',
              detail: 'Version 1.0.0\\n\\nA classic trick-taking card game.\\n\\nDeveloped with Electron + Node.js',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Update game difficulty setting
 * @function updateDifficulty
 * @param {string} level - Difficulty level (easy, medium, hard, expert)
 */
function updateDifficulty(level) {
  store.set('settings.difficulty', level);
  mainWindow.webContents.send('difficulty-changed', level);
}

// Stats functionality placeholder
function showStats() {
  // Placeholder for future stats implementation
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Statistics',
    message: 'Game Statistics',
    detail: 'Statistics feature coming soon!',
    buttons: ['OK']
  });
}

// IPC handlers
ipcMain.handle('get-settings', () => store.get('settings'));
ipcMain.handle('save-settings', (event, settings) => {
  store.set('settings', settings);
  return true;
});

// App event handlers
app.whenReady().then(() => {
  startLocalServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});