# 🃏 Euchre Game

A cross-platform Euchre card game built with Electron and web technologies, featuring AI opponents and authentic Euchre gameplay.

## 🎮 Features

- **Authentic Euchre Rules**: Complete implementation including trump selection, going alone, stick the dealer
- **Smart AI Opponents**: Multiple difficulty levels with intelligent card play
- **Player Customization**: Custom names and avatar selection with emoji options
- **Card Back Themes**: 5 stunning card back designs with intricate patterns
  - **Classic Blue**: Diamond lattice pattern with sparkling accents
  - **Royal Red**: Sophisticated crosshatch weave design
  - **Forest Green**: Mesmerizing swirling conic gradient
  - **Royal Purple**: Radiating segments with diagonal overlays
  - **Golden Elegance**: Luxury striped pattern with metallic highlights
- **Dealer Pickup/Discard**: Proper Euchre mechanic where dealer picks up flipped card and discards
- **Statistics Tracking**: Win/loss records and performance metrics
- **Random Dealer**: Any player can start as dealer, not just the user
- **Mobile Responsive**: Touch-friendly design that works on all screen sizes
- **Cross-Platform**: Native Windows, macOS, and Linux applications
- **Web Version**: Also runs in any modern browser or deployed to Vercel
- **Professional UI**: Clean, intuitive interface with smooth animations

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

### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/euchre-game)

Or deploy manually:
```bash
npm install -g vercel
vercel --prod
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

## 📱 Mobile & Web Deployment

### Mobile-First Design
- **Responsive Layout**: Adapts to all screen sizes from phones to tablets
- **Touch Controls**: Optimized for touch interactions
- **Performance**: Smooth animations even on mobile devices
- **PWA Ready**: Can be installed as a Progressive Web App

### Vercel Deployment
The game is optimized for serverless deployment on Vercel:
- Static file serving from `/public` directory
- No server-side dependencies required for gameplay
- Fast global CDN delivery
- Automatic HTTPS and custom domains

## 📁 Project Structure

```
euchre-game/
├── public/                 # Web application files (served by Vercel)
│   ├── css/
│   │   └── styles.css     # Responsive game styling with mobile support
│   ├── js/
│   │   └── euchre.js      # Complete game logic and AI engine
│   └── index.html         # Main HTML file with mobile meta tags
├── assets/                # Application icons and resources
├── main.js               # Electron main process
├── server.js             # Express server for local development
├── preload.js            # Electron preload script
├── package.json          # Dependencies and build scripts
├── vercel.json           # Vercel deployment configuration
├── commitlint.config.js  # Commit message linting
└── .gitignore           # Git ignore rules
```

## 🎯 Game Rules

Euchre is a trick-taking card game for 4 players in 2 partnerships. The goal is to be the first team to reach 10 points.

### Basic Gameplay
1. **Dealing**: 5 cards per player, flip top card for trump selection
2. **Trump Selection**: Players can order up, assist, or name trump
3. **Playing**: Follow suit if possible, highest trump or suit wins trick
4. **Scoring**: 3+ tricks = 1 point, 5 tricks = 2 points, going alone can score 4 points

### Special Rules
- **Right Bower**: Jack of trump suit (highest card)
- **Left Bower**: Jack of same color as trump (second highest)
- **Going Alone**: Play without partner for extra points
- **Stick the Dealer**: Dealer must choose trump if everyone passes

## 🛠️ Development

### Commit Guidelines

This project uses conventional commits. Format your commit messages as:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code formatting
- `refactor`: Code restructuring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Build/tool changes

**Examples:**
- `feat(game): add difficulty selection`
- `fix(ai): correct trump selection logic`
- `docs(readme): update installation instructions`

### API Endpoints
- `GET /api/stats` - Get game statistics
- `POST /api/stats` - Save statistics
- `POST /api/stats/reset` - Reset statistics

### Technologies Used
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Desktop**: Electron
- **Server**: Express.js (for web version)
- **Build**: electron-builder
- **Linting**: commitlint with conventional commits

## 📝 License

MIT License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow commit message conventions
4. Test your changes thoroughly
5. Submit a pull request

---
Made with ❤️ using Electron + Node.js
