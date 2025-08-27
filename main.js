const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Configuration
const isDev = process.argv.includes('--dev');
const isWin = process.platform === 'win32';

const store = new Store({
  name: 'euchre-stats',
  defaults: {
    stats: {
      totalHands: 0,
      tricksWon: 0,
      gamesWon: 0,
      gamesLost: 0,
      winStreak: 0,
      bestWinStreak: 0
    },
    settings: {
      difficulty: 'medium',
      soundEnabled: true,
      animationSpeed: 'normal',
      cardBack: 'classic'
    }
  }
});

let mainWindow;
let serverProcess;

// Start local server in production
function startLocalServer() {
  if (!isDev) {
    const { spawn } = require('child_process');
    const serverPath = path.join(__dirname, 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      shell: isWin
    });
    
    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
    });
  }
}

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
    icon: path.join(__dirname, 'assets', isWin ? 'icon.ico' : 'icon.png'),
    title: 'Euchre',
    backgroundColor: '#667eea',
    show: false
  });

  // Load the game
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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
              detail: 'Version 1.0.0\n\nA classic trick-taking card game.\n\nDeveloped with Electron + Node.js',
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

function updateDifficulty(level) {
  store.set('settings.difficulty', level);
  mainWindow.webContents.send('difficulty-changed', level);
}

function showStats() {
  const stats = store.get('stats');
  const statsMessage = `
Total Hands: ${stats.totalHands}
Tricks Won: ${stats.tricksWon}
Games Won: ${stats.gamesWon}
Games Lost: ${stats.gamesLost}
Current Win Streak: ${stats.winStreak}
Best Win Streak: ${stats.bestWinStreak}
Win Rate: ${stats.gamesWon + stats.gamesLost > 0 ? 
  ((stats.gamesWon / (stats.gamesWon + stats.gamesLost)) * 100).toFixed(1) : 0}%
  `;
  
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'Game Statistics',
    message: 'Your Euchre Statistics',
    detail: statsMessage,
    buttons: ['OK', 'Reset Stats']
  }).then((response) => {
    if (response.response === 1) {
      store.set('stats', {
        totalHands: 0,
        tricksWon: 0,
        gamesWon: 0,
        gamesLost: 0,
        winStreak: 0,
        bestWinStreak: 0
      });
      mainWindow.webContents.send('stats-reset');
    }
  });
}

// IPC handlers
ipcMain.handle('get-stats', () => store.get('stats'));
ipcMain.handle('save-stats', (event, stats) => {
  store.set('stats', stats);
  return true;
});
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
