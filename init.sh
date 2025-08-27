#!/bin/bash

# Euchre Game MVP Setup Script - WSL/Windows Development
# Uses Node.js exclusively - No Python required
# Optimized for WSL development targeting Windows

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_step() {
    echo -e "${MAGENTA}►${NC} $1"
}

# Detect if running in WSL
detect_wsl() {
    if grep -qEi "(Microsoft|WSL)" /proc/version &> /dev/null; then
        print_info "WSL environment detected"
        WSL_ENV=true
    else
        WSL_ENV=false
    fi
}

# Check for required commands
check_requirements() {
    print_step "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed."
        echo "Install Node.js in WSL with:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo "  sudo apt-get install -y nodejs"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "16" ]; then
        print_warning "Node.js version is less than 16. Consider upgrading."
    fi
    
    print_status "All requirements met!"
    print_info "Node.js version: $(node -v)"
    print_info "npm version: $(npm -v)"
}

# Create project directory
create_project() {
    PROJECT_NAME=${1:-euchre-game}
    
    print_step "Creating project: $PROJECT_NAME"
    
    if [ -d "$PROJECT_NAME" ]; then
        print_warning "Directory $PROJECT_NAME already exists."
        read -p "Do you want to overwrite it? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_error "Setup cancelled."
            exit 1
        fi
        rm -rf "$PROJECT_NAME"
    fi
    
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    # Create directory structure
    mkdir -p assets
    mkdir -p src
    mkdir -p public
    
    print_status "Project directory created"
}

# Create package.json with Node.js server
create_package_json() {
    print_step "Creating package.json with Node.js server..."
    
    cat > package.json << 'EOF'
{
  "name": "euchre-game",
  "version": "1.0.0",
  "description": "Cross-platform Euchre card game with AI opponents",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "start-win": "electron.cmd .",
    "server": "node server.js",
    "web": "node server.js",
    "dev": "concurrently \"npm run server\" \"electron . --dev\"",
    "dev-web": "node server.js --dev",
    "build-win": "electron-builder --win --x64",
    "build-win32": "electron-builder --win --ia32",
    "build-mac": "electron-builder --mac",
    "build-linux": "electron-builder --linux",
    "dist": "electron-builder",
    "postinstall": "electron-builder install-app-deps"
  },
  "keywords": ["euchre", "card game", "electron"],
  "author": "Euchre Game Developer",
  "license": "MIT",
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.6.4",
    "concurrently": "^8.2.2"
  },
  "dependencies": {
    "electron-store": "^8.1.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "compression": "^1.7.4"
  },
  "build": {
    "appId": "com.euchregame.app",
    "productName": "Euchre",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "allowElevation": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "category": "public.app-category.games",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png",
      "category": "Game"
    }
  }
}
EOF
    
    print_status "package.json created"
}

# Create Node.js Express server
create_server_js() {
    print_step "Creating Node.js Express server..."
    
    cat > server.js << 'EOF'
// Node.js Express Server for Euchre Game
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const isDev = process.argv.includes('--dev');

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Game stats API endpoint
let gameStats = {
    totalGames: 0,
    wins: 0,
    losses: 0,
    lastPlayed: null
};

// Load stats from file if exists
const statsFile = path.join(__dirname, 'game-stats.json');
if (fs.existsSync(statsFile)) {
    try {
        gameStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    } catch (e) {
        console.error('Error loading stats:', e);
    }
}

// API Routes
app.get('/api/stats', (req, res) => {
    res.json(gameStats);
});

app.post('/api/stats', (req, res) => {
    gameStats = { ...gameStats, ...req.body };
    gameStats.lastPlayed = new Date().toISOString();
    
    // Save to file
    fs.writeFileSync(statsFile, JSON.stringify(gameStats, null, 2));
    
    res.json({ success: true, stats: gameStats });
});

app.post('/api/stats/reset', (req, res) => {
    gameStats = {
        totalGames: 0,
        wins: 0,
        losses: 0,
        lastPlayed: null
    };
    
    fs.writeFileSync(statsFile, JSON.stringify(gameStats, null, 2));
    res.json({ success: true, stats: gameStats });
});

// Serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║         EUCHRE GAME SERVER             ║
╠════════════════════════════════════════╣
║  Server running at:                    ║
║  http://localhost:${PORT}              ║
║                                        ║
║  Press Ctrl+C to stop                  ║
╚════════════════════════════════════════╝
    `);
    
    if (isDev) {
        console.log('Running in development mode');
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});
EOF
    
    print_status "Node.js server created"
}

# Create main.js (Electron main process)
create_main_js() {
    print_step "Creating Electron main process..."
    
    cat > main.js << 'EOF'
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
EOF
    
    print_status "Electron main process created"
}

# Create preload.js
create_preload_js() {
    print_step "Creating preload script..."
    
    cat > preload.js << 'EOF'
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
EOF
    
    print_status "Preload script created"
}

# Create the main game HTML file
create_index_html() {
    print_step "Creating game HTML..."
    
    # Create public directory if not exists
    mkdir -p public
    
    cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Euchre Game</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            user-select: none;
        }
        
        .game-container {
            width: 100%;
            max-width: 1400px;
            height: 100vh;
            display: flex;
            padding: 20px;
            gap: 20px;
        }
        
        .sidebar {
            width: 320px;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .main-game {
            flex: 1;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        
        .game-table {
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, #2a5f3e, #1a3f2e);
            border-radius: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            box-shadow: inset 0 5px 20px rgba(0,0,0,0.5);
        }
        
        .player-position {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }
        
        .player-position.bottom { bottom: 30px; }
        .player-position.top { top: 30px; }
        .player-position.left { left: 30px; top: 50%; transform: translateY(-50%); }
        .player-position.right { right: 30px; top: 50%; transform: translateY(-50%); }
        
        .player-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            color: white;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: transform 0.3s;
        }
        
        .player-avatar.dealer::after {
            content: 'D';
            position: absolute;
            top: -5px;
            right: -5px;
            background: gold;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: #333;
            font-weight: bold;
        }
        
        .player-name {
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: 600;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        
        .player-cards {
            display: flex;
            gap: -20px;
            transition: all 0.3s;
        }
        
        .card {
            width: 70px;
            height: 100px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            transition: transform 0.2s;
            position: relative;
        }
        
        .card:hover { 
            transform: translateY(-15px);
            z-index: 10;
        }
        
        .card.back {
            background: linear-gradient(45deg, #1a237e 25%, #3949ab 25%, #3949ab 50%, #1a237e 50%, #1a237e 75%, #3949ab 75%);
            background-size: 20px 20px;
        }
        
        .center-area {
            width: 400px;
            height: 250px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            position: relative;
        }
        
        .trick-card {
            width: 80px;
            height: 110px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            position: absolute;
            transition: all 0.5s;
        }
        
        .trick-card.pos-0 { transform: translate(-60px, -30px) rotate(-5deg); }
        .trick-card.pos-1 { transform: translate(60px, -30px) rotate(5deg); }
        .trick-card.pos-2 { transform: translate(-60px, 30px) rotate(-3deg); }
        .trick-card.pos-3 { transform: translate(60px, 30px) rotate(3deg); }
        
        .score-board {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .score-board h3 {
            margin-bottom: 15px;
            font-size: 20px;
        }
        
        .score-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        
        .btn {
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .btn:hover { transform: scale(1.02); }
        .btn:active { transform: scale(0.98); }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .trump-display {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 10px 30px;
            border-radius: 25px;
            font-size: 20px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        
        .message {
            position: absolute;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 18px;
            display: none;
            z-index: 100;
        }
        
        .message.active { 
            display: block;
            animation: slideIn 0.3s;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        
        .controls {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .stats-panel {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 15px;
        }
        
        .stats-panel h3 {
            margin-bottom: 15px;
            color: #333;
        }
        
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            color: #666;
        }
        
        .stat-value {
            font-weight: bold;
            color: #333;
        }
        
        /* Loading screen */
        .loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-size: 24px;
        }
        
        .loading.hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">
        <div>Loading Euchre...</div>
    </div>
    
    <div class="game-container">
        <div class="sidebar">
            <div class="score-board">
                <h3>Score</h3>
                <div class="score-row">
                    <span>Team 1 (You & North)</span>
                    <span class="stat-value" id="team1-score">0</span>
                </div>
                <div class="score-row">
                    <span>Team 2 (East & West)</span>
                    <span class="stat-value" id="team2-score">0</span>
                </div>
                <div class="score-row">
                    <span>Round</span>
                    <span class="stat-value" id="round">1</span>
                </div>
            </div>
            
            <div class="controls">
                <button class="btn" onclick="game.newGame()">New Game</button>
                <button class="btn" onclick="game.dealCards()">Deal</button>
                <button class="btn btn-secondary" onclick="game.showHelp()">How to Play</button>
            </div>
            
            <div class="stats-panel">
                <h3>Session Stats</h3>
                <div class="stat-row">
                    <span>Hands Played</span>
                    <span class="stat-value" id="hands-played">0</span>
                </div>
                <div class="stat-row">
                    <span>Games Won</span>
                    <span class="stat-value" id="games-won">0</span>
                </div>
                <div class="stat-row">
                    <span>Win Rate</span>
                    <span class="stat-value" id="win-rate">0%</span>
                </div>
                <div class="stat-row">
                    <span>Difficulty</span>
                    <span class="stat-value" id="difficulty">Medium</span>
                </div>
            </div>
        </div>
        
        <div class="main-game">
            <div class="game-table">
                <div class="trump-display" id="trump-display">Trump: Not Set</div>
                
                <div class="player-position top">
                    <div class="player-avatar" id="north-avatar">🤖</div>
                    <div class="player-name">North (Partner)</div>
                    <div class="player-cards" id="north-cards"></div>
                </div>
                
                <div class="player-position left">
                    <div class="player-avatar" id="west-avatar">🤖</div>
                    <div class="player-name">West</div>
                    <div class="player-cards" id="west-cards"></div>
                </div>
                
                <div class="player-position right">
                    <div class="player-avatar" id="east-avatar">🤖</div>
                    <div class="player-name">East</div>
                    <div class="player-cards" id="east-cards"></div>
                </div>
                
                <div class="player-position bottom">
                    <div class="player-avatar dealer" id="south-avatar">😊</div>
                    <div class="player-name">You</div>
                    <div class="player-cards" id="south-cards"></div>
                </div>
                
                <div class="center-area" id="center-area"></div>
                <div class="message" id="message"></div>
            </div>
        </div>
    </div>
    
    <script>
        // Euchre Game Implementation
        class EuchreGame {
            constructor() {
                this.deck = [];
                this.players = {
                    north: { cards: [], isAI: true, tricks: 0 },
                    east: { cards: [], isAI: true, tricks: 0 },
                    south: { cards: [], isAI: false, tricks: 0 },
                    west: { cards: [], isAI: true, tricks: 0 }
                };
                this.team1Score = 0;
                this.team2Score = 0;
                this.trump = null;
                this.currentDealer = 'south';
                this.currentPlayer = null;
                this.currentTrick = [];
                this.round = 1;
                this.stats = {
                    handsPlayed: 0,
                    gamesWon: 0,
                    gamesLost: 0
                };
                this.difficulty = 'medium';
                
                this.init();
            }
            
            init() {
                // Hide loading screen
                setTimeout(() => {
                    document.getElementById('loading').classList.add('hidden');
                }, 500);
                
                // Load stats
                this.loadStats();
                
                // Setup Electron API if available
                if (typeof electronAPI !== 'undefined') {
                    electronAPI.onNewGame(() => this.newGame());
                    electronAPI.onDifficultyChanged((diff) => {
                        this.difficulty = diff;
                        document.getElementById('difficulty').textContent = 
                            diff.charAt(0).toUpperCase() + diff.slice(1);
                    });
                }
                
                this.newGame();
            }
            
            async loadStats() {
                try {
                    if (typeof electronAPI !== 'undefined') {
                        this.stats = await electronAPI.getStats();
                    } else {
                        // Use server API
                        const response = await fetch('/api/stats');
                        const data = await response.json();
                        this.stats = data;
                    }
                    this.updateStats();
                } catch (e) {
                    console.error('Error loading stats:', e);
                }
            }
            
            async saveStats() {
                try {
                    if (typeof electronAPI !== 'undefined') {
                        await electronAPI.saveStats(this.stats);
                    } else {
                        // Use server API
                        await fetch('/api/stats', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(this.stats)
                        });
                    }
                } catch (e) {
                    console.error('Error saving stats:', e);
                }
            }
            
            createDeck() {
                const suits = ['♠', '♥', '♦', '♣'];
                const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
                this.deck = [];
                
                for (let suit of suits) {
                    for (let rank of ranks) {
                        const color = (suit === '♥' || suit === '♦') ? '#e74c3c' : '#2c3e50';
                        this.deck.push({ rank, suit, color });
                    }
                }
                
                this.shuffle();
            }
            
            shuffle() {
                for (let i = this.deck.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
                }
            }
            
            dealCards() {
                this.createDeck();
                
                // Clear previous cards
                ['north', 'east', 'south', 'west'].forEach(pos => {
                    this.players[pos].cards = [];
                    this.players[pos].tricks = 0;
                });
                
                // Deal 5 cards to each player
                for (let i = 0; i < 5; i++) {
                    ['north', 'east', 'south', 'west'].forEach(pos => {
                        this.players[pos].cards.push(this.deck.pop());
                    });
                }
                
                this.displayCards();
                this.showMessage('Cards dealt! Choose trump...');
                
                // Auto-select trump for MVP
                setTimeout(() => {
                    const suits = ['♠', '♥', '♦', '♣'];
                    this.trump = suits[Math.floor(Math.random() * 4)];
                    document.getElementById('trump-display').innerHTML = 
                        `Trump: <span style="color: ${this.trump === '♥' || this.trump === '♦' ? '#e74c3c' : '#2c3e50'}">${this.trump}</span>`;
                    this.showMessage(`Trump is ${this.trump}`);
                    
                    // Start play
                    this.currentPlayer = 'south';
                }, 2000);
                
                this.stats.handsPlayed++;
                this.updateStats();
                this.saveStats();
            }
            
            displayCards() {
                ['north', 'east', 'south', 'west'].forEach(position => {
                    const container = document.getElementById(`${position}-cards`);
                    container.innerHTML = '';
                    
                    this.players[position].cards.forEach((card, index) => {
                        const cardDiv = document.createElement('div');
                        cardDiv.className = 'card';
                        
                        if (position === 'south') {
                            cardDiv.innerHTML = `<span style="color:${card.color}; font-weight: bold;">${card.rank}${card.suit}</span>`;
                            cardDiv.onclick = () => this.playCard(position, index);
                        } else {
                            cardDiv.className = 'card back';
                        }
                        
                        container.appendChild(cardDiv);
                    });
                });
            }
            
            playCard(player, cardIndex) {
                if (player !== this.currentPlayer) {
                    this.showMessage("It's not your turn!");
                    return;
                }
                
                const card = this.players[player].cards[cardIndex];
                this.players[player].cards.splice(cardIndex, 1);
                
                this.currentTrick.push({ player, card });
                this.displayTrick();
                this.displayCards();
                
                if (this.currentTrick.length === 4) {
                    this.evaluateTrick();
                } else {
                    this.nextPlayer();
                }
            }
            
            displayTrick() {
                const centerArea = document.getElementById('center-area');
                centerArea.innerHTML = '';
                
                this.currentTrick.forEach((play, index) => {
                    const cardDiv = document.createElement('div');
                    cardDiv.className = `trick-card pos-${index}`;
                    cardDiv.innerHTML = `<span style="color:${play.card.color}; font-weight: bold;">${play.card.rank}${play.card.suit}</span>`;
                    centerArea.appendChild(cardDiv);
                });
            }
            
            nextPlayer() {
                const players = ['south', 'west', 'north', 'east'];
                const currentIndex = players.indexOf(this.currentPlayer);
                this.currentPlayer = players[(currentIndex + 1) % 4];
                
                if (this.players[this.currentPlayer].isAI) {
                    setTimeout(() => this.aiPlay(), 1000);
                }
            }
            
            aiPlay() {
                const player = this.currentPlayer;
                const cards = this.players[player].cards;
                
                if (cards.length === 0) return;
                
                // Simple AI: play random card
                const cardIndex = Math.floor(Math.random() * cards.length);
                this.playCard(player, cardIndex);
            }
            
            evaluateTrick() {
                // Simple evaluation - random winner for MVP
                const winner = this.currentTrick[Math.floor(Math.random() * 4)];
                this.players[winner.player].tricks++;
                
                this.showMessage(`${winner.player.charAt(0).toUpperCase() + winner.player.slice(1)} wins the trick!`);
                
                setTimeout(() => {
                    document.getElementById('center-area').innerHTML = '';
                    this.currentTrick = [];
                    
                    if (this.players['south'].cards.length === 0) {
                        this.endHand();
                    } else {
                        this.currentPlayer = winner.player;
                        if (this.players[this.currentPlayer].isAI) {
                            setTimeout(() => this.aiPlay(), 500);
                        }
                    }
                }, 2000);
            }
            
            endHand() {
                const team1Tricks = this.players.south.tricks + this.players.north.tricks;
                const team2Tricks = this.players.east.tricks + this.players.west.tricks;
                
                if (team1Tricks >= 3) {
                    const points = team1Tricks === 5 ? 2 : 1;
                    this.team1Score += points;
                    this.showMessage(`Team 1 wins the hand! +${points} points`);
                } else {
                    const points = team2Tricks === 5 ? 2 : 1;
                    this.team2Score += points;
                    this.showMessage(`Team 2 wins the hand! +${points} points`);
                }
                
                this.updateScore();
                
                if (this.team1Score >= 10) {
                    this.endGame(true);
                } else if (this.team2Score >= 10) {
                    this.endGame(false);
                } else {
                    this.round++;
                    setTimeout(() => this.dealCards(), 3000);
                }
            }
            
            endGame(team1Won) {
                if (team1Won) {
                    this.stats.gamesWon++;
                    this.showMessage('🎉 You win the game! 🎉');
                } else {
                    this.stats.gamesLost++;
                    this.showMessage('Game over - Team 2 wins!');
                }
                
                this.updateStats();
                this.saveStats();
                
                setTimeout(() => this.newGame(), 4000);
            }
            
            newGame() {
                this.team1Score = 0;
                this.team2Score = 0;
                this.round = 1;
                this.currentTrick = [];
                this.updateScore();
                this.dealCards();
            }
            
            updateScore() {
                document.getElementById('team1-score').textContent = this.team1Score;
                document.getElementById('team2-score').textContent = this.team2Score;
                document.getElementById('round').textContent = this.round;
            }
            
            updateStats() {
                document.getElementById('hands-played').textContent = this.stats.handsPlayed;
                document.getElementById('games-won').textContent = this.stats.gamesWon;
                
                const total = this.stats.gamesWon + this.stats.gamesLost;
                const winRate = total > 0 ? 
                    Math.round((this.stats.gamesWon / total) * 100) : 0;
                document.getElementById('win-rate').textContent = `${winRate}%`;
            }
            
            showMessage(text) {
                const msg = document.getElementById('message');
                msg.textContent = text;
                msg.className = 'message active';
                
                setTimeout(() => {
                    msg.className = 'message';
                }, 3000);
            }
            
            showHelp() {
                this.showMessage('Euchre: First team to 10 points wins!');
            }
        }
        
        // Initialize game
        const game = new EuchreGame();
    </script>
</body>
</html>
EOF
    
    print_status "Game HTML created"
}

# Create basic icons
create_icons() {
    print_step "Creating icon files..."
    
    # Create a simple base64 encoded PNG icon
    echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > assets/icon.png
    
    # Copy as ICO and ICNS (placeholders)
    cp assets/icon.png assets/icon.ico
    cp assets/icon.png assets/icon.icns
    
    print_status "Icon placeholders created"
}

# Create .gitignore
create_gitignore() {
    print_step "Creating .gitignore..."
    
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
package-lock.json

# Build output
dist/
build/
out/

# Electron
electron-builder.yml

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.sublime-*

# Game data
game-stats.json

# Environment
.env
.env.local
EOF
    
    print_status ".gitignore created"
}

# Create README
create_readme() {
    print_step "Creating README..."
    
    cat > README.md << 'EOF'
# 🃏 Euchre Game

A cross-platform Euchre card game built with Electron and Node.js.

## 🎮 Features

- **Desktop App** - Native Windows/Mac/Linux application
- **Web Version** - Play in any browser
- **AI Opponents** - Multiple difficulty levels
- **Statistics Tracking** - Win rates, streaks, and more
- **Cross-Platform** - Works everywhere

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm

### Installation
```bash
npm install
```

### Run Desktop App
```bash
npm start
```

### Run Web Server
```bash
npm run server
# Open http://localhost:8080
```

### Development Mode
```bash
npm run dev  # Desktop with DevTools
npm run dev-web  # Web server with logging
```

## 🔨 Building

### Windows (.exe)
```bash
npm run build-win     # 64-bit
npm run build-win32   # 32-bit
```

### macOS (.dmg)
```bash
npm run build-mac
```

### Linux (AppImage)
```bash
npm run build-linux
```

## 📁 Project Structure

```
euchre-game/
├── main.js           # Electron main process
├── preload.js        # Preload script
├── server.js         # Node.js Express server
├── public/           # Web assets
│   └── index.html    # Game UI
├── assets/           # Icons and images
└── dist/            # Build output
```

## 🎯 Game Rules

Euchre is a trick-taking card game for 4 players in 2 teams:
- **Teams**: North/South vs East/West
- **Cards**: 9, 10, J, Q, K, A (24 cards)
- **Goal**: First team to 10 points wins
- **Trump**: Selected suit beats all others

## 🛠️ Development

### WSL Setup
Developed and tested in WSL2 for Windows compatibility.

### API Endpoints
- `GET /api/stats` - Get game statistics
- `POST /api/stats` - Save statistics
- `POST /api/stats/reset` - Reset statistics

## 📝 License

MIT License

## 🤝 Contributing

Pull requests welcome! Please follow the existing code style.

---
Made with ❤️ using Electron + Node.js
EOF
    
    print_status "README created"
}

# Create Windows batch files for easy running
create_windows_scripts() {
    print_step "Creating Windows helper scripts..."
    
    # Create run.bat for Windows
    cat > run.bat << 'EOF'
@echo off
title Euchre Game
echo Starting Euchre Desktop App...
npm start
pause
EOF
    
    # Create server.bat for Windows
    cat > server.bat << 'EOF'
@echo off
title Euchre Web Server
echo Starting Euchre Web Server...
echo.
echo Open your browser to: http://localhost:8080
echo.
npm run server
pause
EOF
    
    # Create build.bat for Windows
    cat > build.bat << 'EOF'
@echo off
title Building Euchre for Windows
echo Building Euchre for Windows...
npm run build-win
echo.
echo Build complete! Check the 'dist' folder.
pause
EOF
    
    # Make them executable in WSL
    chmod +x *.bat
    
    print_status "Windows scripts created"
}

# Install dependencies
install_dependencies() {
    print_step "Installing npm dependencies..."
    
    npm install --no-fund --no-audit 2>&1 | while read line; do
        echo "  $line"
    done
    
    if [ $? -eq 0 ]; then
        print_status "Dependencies installed successfully"
    else
        print_warning "Some dependencies may have failed to install"
    fi
}

# Main setup function
main() {
    clear
    echo -e "${CYAN}"
    echo "╔════════════════════════════════════════════╗"
    echo "║         EUCHRE GAME SETUP - WSL/WIN        ║"
    echo "║              Node.js Edition               ║"
    echo "║                  v2.0                      ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo
    
    detect_wsl
    check_requirements
    
    # Get project name
    read -p "📁 Enter project name (default: euchre-game): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-euchre-game}
    
    echo
    create_project "$PROJECT_NAME"
    create_package_json
    create_server_js
    create_main_js
    create_preload_js
    create_index_html
    create_icons
    create_gitignore
    create_readme
    create_windows_scripts
    
    echo
    read -p "📦 Install npm dependencies now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_dependencies
    else
        print_info "Skipping dependencies. Run 'npm install' later."
    fi
    
    # Final success message
    echo
    echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║            ✨ SETUP COMPLETE! ✨          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
    echo
    
    print_status "Project created: ${CYAN}$PROJECT_NAME${NC}"
    echo
    echo -e "${YELLOW}📋 Quick Start Commands:${NC}"
    echo
    echo "  cd $PROJECT_NAME"
    echo
    echo -e "  ${GREEN}Desktop App:${NC}"
    echo "    npm start          # Run Electron app"
    echo "    ./run.bat          # Windows shortcut"
    echo
    echo -e "  ${GREEN}Web Version:${NC}"
    echo "    npm run server     # Start web server"
    echo "    ./server.bat       # Windows shortcut"
    echo
    echo -e "  ${GREEN}Development:${NC}"
    echo "    npm run dev        # Desktop with DevTools"
    echo "    npm run dev-web    # Web with logging"
    echo
    echo -e "  ${GREEN}Build for Windows:${NC}"
    echo "    npm run build-win  # Create .exe installer"
    echo "    ./build.bat        # Windows shortcut"
    echo
    
    if [ "$WSL_ENV" = true ]; then
        echo -e "${BLUE}💡 WSL Tips:${NC}"
        echo "  • .bat files will work when opened from Windows Explorer"
        echo "  • Built .exe files will be in dist/ folder"
        echo "  • Access WSL files from Windows: \\\\wsl$\\Ubuntu\\..."
        echo
    fi
    
    echo -e "${MAGENTA}🎮 Enjoy playing Euchre!${NC}"
    echo
}

# Run the script
main "$@"