# 🃏 Euchre Game

[![Build Status](https://github.com/cxm6467/euchre-game/actions/workflows/build.yml/badge.svg)](https://github.com/cxm6467/euchre-game/actions/workflows/build.yml)

A cross-platform Euchre card game built with Electron and web technologies, featuring intelligent AI opponents and authentic Euchre gameplay with comprehensive rules implementation.

## 🎮 Features

### Game Mechanics
- **Authentic Euchre Rules**: Complete implementation with all traditional rules
- **Trump Selection**: Multi-round bidding with "order up", "assist", and color calling
- **Going Alone**: Optional solo play for higher scoring potential
- **Stick the Dealer**: Dealer must choose trump if all players pass
- **Dealer Mechanics**: Proper card pickup and discard system
- **Bower System**: Right bower (Jack of trump) and left bower (Jack of same color)

### AI & Gameplay
- **Intelligent AI Opponents**: Three difficulty levels with strategic card play
- **Partnership Teams**: You & North vs. East & West team dynamics
- **Random Dealer**: Dealer position rotates, can start with any player
- **Trick-Taking Logic**: Proper suit following and trump hierarchy
- **Score Tracking**: First team to 10 points wins

### Interface & Customization
- **Player Profiles**: Customizable names and emoji avatars
- **Visual Turn Indicators**: Player name highlighting shows current turn
- **Card Back Themes**: 5 elegant card back designs to choose from
  - Classic Blue (diamond lattice)
  - Royal Red (crosshatch weave) 
  - Forest Green (swirling gradient)
  - Royal Purple (radiating segments)
  - Golden Elegance (striped metallic)
- **Sound Effects**: Synthesized audio with mute toggle
- **Statistics Tracking**: Win/loss records and game metrics
- **Mobile Responsive**: Touch-optimized for all screen sizes

### Cross-Platform Support
- **Desktop Apps**: Native Windows (.exe), macOS (.dmg), and Linux (.AppImage)
- **Web Version**: Runs in any modern browser with Express.js backend
- **Electron Integration**: Desktop features with Vercel Analytics
- **PWA Support**: Installable as Progressive Web App on mobile

## 📦 Downloads

Download pre-built applications from the [GitHub Releases page](https://github.com/cxm6467/euchre-game/releases):

- **Windows**: Download the `.exe` installer
- **macOS**: Download the `.dmg` file
- **Linux**: Download the `.AppImage` file

### Installation Instructions:
- **Windows**: Run the installer and follow the setup wizard
- **macOS**: Open the DMG and drag the app to Applications
- **Linux**: Make the AppImage executable: `chmod +x *.AppImage && ./Euchre-*.AppImage`

## 🚀 Development Setup

### Prerequisites
- Node.js 16+ and npm

### Installation
```bash
git clone https://github.com/cxm6467/euchre-game.git
cd euchre-game
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
npm run dev      # Desktop with DevTools and hot reload
npm run dev-web  # Web server with development logging
```

## 🔨 Building Executables

### Windows (.exe installer)
```bash
npm run build-win      # 64-bit NSIS installer
npm run build-win32    # 32-bit version
```

### macOS (.dmg)
```bash
npm run build-mac      # Universal binary (x64 + ARM64)
```

### Linux (AppImage)
```bash
npm run build-linux    # Portable AppImage
```

## 🧪 Testing

### Run Tests
```bash
npm test           # Run comprehensive game logic tests
npm run test:watch # Watch mode for development
```

### Validation
```bash
npm run validate   # Run linting and tests
npm run lint       # Code quality checks
```

## 📁 Project Architecture

```
euchre-game/
├── .github/workflows/        # CI/CD pipeline
│   └── build.yml            # Automated builds and releases
├── public/                  # Web application
│   ├── css/styles.css      # Responsive UI with card themes
│   ├── js/euchre.js        # Core game engine (1000+ lines)
│   └── index.html          # Mobile-optimized interface
├── electron/               # Desktop application
│   ├── main.js            # Main process with window management
│   └── preload.js         # Secure renderer communication
├── assets/                # Application resources
│   ├── icon.ico/.icns/.png # Platform-specific icons
│   └── entitlements.mac.plist # macOS signing configuration
├── tests/                 # Test suite
│   └── euchre.test.js     # Comprehensive unit tests
├── server.js             # Express.js web server with API
├── run-tests.js          # Node.js test runner
├── package.json          # Dependencies and build configuration
└── game-stats.json       # Persistent statistics storage
```

## 🎯 Game Rules & Scoring

### Basic Gameplay
1. **Setup**: 24-card deck (9, 10, J, Q, K, A), 4 players, 2 teams
2. **Dealing**: 5 cards per player, flip top card for trump selection
3. **Trump Selection**: 
   - Round 1: Players can "order up" the flipped card
   - Round 2: Players can call any suit except the flipped suit
   - Stick the dealer: Dealer must choose if all pass
4. **Playing**: Follow suit, highest card wins trick
5. **Scoring**: Team needs 3+ tricks to score

### Scoring System
- **3-4 tricks**: 1 point
- **All 5 tricks (march)**: 2 points  
- **Going alone (3-4 tricks)**: 1 point
- **Going alone (all 5 tricks)**: 4 points
- **Euchred**: Opposing team scores 2 points
- **First to 10 points wins**

### Special Cards (Trump Suit)
1. **Right Bower**: Jack of trump suit (highest)
2. **Left Bower**: Jack of same color as trump (2nd highest)
3. **Ace, King, Queen, 10, 9** of trump suit (in descending order)

## 🛠️ Development & API

### REST API Endpoints
- `GET /api/stats` - Retrieve game statistics
- `POST /api/stats` - Update game statistics  
- `POST /api/stats/reset` - Reset statistics

### Electron IPC Events
- `get-stats` / `set-stats` - Statistics management
- `new-game` - Start new game
- `difficulty-changed` - AI difficulty updates

### Architecture Features
- **Dual Environment**: Works as both Electron app and web application
- **State Management**: Centralized game state with persistence
- **Analytics Integration**: Vercel Analytics for usage tracking
- **Error Handling**: Comprehensive error management and recovery
- **Mobile Support**: Touch events and responsive breakpoints

## 🎨 Customization

### Player Settings
- Custom names and emoji avatars
- AI opponent profile randomization
- Sound preferences and mute controls

### Visual Themes
- 5 intricate card back designs
- Smooth animations and transitions
- Professional UI with subtle effects

## 🔄 Continuous Integration

The project uses GitHub Actions for automated:
- **Multi-platform builds** (Windows, macOS, Linux)
- **Automated testing** on all platforms
- **Release management** with version tagging
- **Artifact distribution** via GitHub Releases

## 📝 Commit Guidelines

Uses conventional commits with automatic linting:

```
feat(game): add difficulty selection
fix(ai): correct trump selection logic  
docs(readme): update installation guide
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow commit conventions
4. Run tests (`npm test`)
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with Electron, Node.js, and modern web technologies**