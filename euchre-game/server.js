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
