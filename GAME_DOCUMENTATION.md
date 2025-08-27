# 🃏 Euchre AI - Comprehensive Game Documentation

## Table of Contents
- [Overview](#overview)
- [Game Rules](#game-rules)  
- [Features](#features)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Development](#development)

## Overview

Euchre AI is a sophisticated implementation of the classic Euchre card game featuring:
- **Smart AI opponents** with strategic play
- **Visual suit enforcement** with greyed out illegal cards
- **Comprehensive rule validation** including bower logic
- **Interactive UI** with inline player customization
- **Full test coverage** with automated validation
- **Cross-platform deployment** (Web, Electron, Vercel)

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Testing**: Custom test framework with comprehensive coverage
- **Deployment**: Vercel, Electron desktop apps
- **Development**: Node.js tooling with linting and validation

## Game Rules

### Basic Euchre Rules
- **Players**: 4 players in 2 teams (You & North vs East & West)
- **Cards**: 24-card deck (9, 10, J, Q, K, A in all suits)
- **Goal**: First team to **10 points** wins

### Card Hierarchy (Trump Suit)
1. **Right Bower** - Jack of trump suit (highest)
2. **Left Bower** - Jack of same color as trump (second highest)
3. **Trump Ace** through **Trump 9** (descending)
4. **Non-Trump**: A, K, Q, J, 10, 9 (descending)

### Gameplay Flow
1. **Deal**: 5 cards to each player + 1 flipped for trump
2. **Trump Selection**: Players can "order up" the flipped card or pass
3. **Play Tricks**: Must follow suit if possible
4. **Score**: Team that called trump needs 3+ tricks to score

### Scoring System
- **Make It**: 3-4 tricks = 1 point
- **March**: All 5 tricks = 2 points  
- **Euchred**: Fail to get 3 tricks, opponents get 2 points
- **Alone March**: All 5 tricks playing alone = 4 points

## Features

### 🎮 Core Gameplay
- **Authentic Rules**: Complete Euchre rule implementation
- **Smart AI**: Strategic opponents with difficulty scaling
- **Bower Logic**: Proper Jack hierarchy and suit following
- **Trump Selection**: Two-round bidding system with mini card display
- **Going Alone**: High-risk, high-reward solo play (available for all players)
- **AI Alone Strategy**: NPCs can go alone with strategic probability

### 🎨 Visual Features
- **Suit Enforcement**: Greyed out cards when you can't play them
- **Turn Indicator**: Animated arrow showing current player
- **Realistic Cards**: Traditional card design with corner indices
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Theme**: Professional dark grey background

### 👤 Player Customization
- **Inline Editing**: Click names and avatars to edit
- **Fun NPC Profiles**: Randomized character names and emojis on first load
- **Persistent Settings**: Customizations saved across games
- **Visual Indicators**: Pencil icons show editable elements
- **Random Initialization**: Fresh NPCs assigned automatically for new players

### 📊 Game Information
- **Live Scoring**: Real-time score and trick tracking
- **Game Statistics**: Hands played, wins/losses
- **Console Logging**: Detailed debug information with emojis
- **Rule Explanations**: Built-in help with official rules link

## Architecture

### File Structure
```
euchre-game/
├── public/
│   ├── css/styles.css      # All styling and animations
│   ├── js/euchre.js        # Main game logic (1600+ lines)
│   └── index.html          # Game interface
├── tests/
│   └── euchre.test.js      # Comprehensive test suite
├── assets/                 # Icons and build assets
├── main.js                 # Electron main process
├── server.js              # Express server for web version
└── package.json           # Dependencies and scripts
```

### Core Classes

#### `EuchreGame` Main Class
Central game controller handling:
- Game state management
- Player turn logic
- Card dealing and shuffling  
- Trump selection process
- Scoring calculations
- AI decision making
- UI updates and interactions

### Key Methods

#### Card Management
- `createDeck()` - Generates 24-card Euchre deck
- `shuffle()` - Randomizes deck order
- `dealCards()` - Distributes cards in 3+2 or 2+3 pattern
- `displayCards()` - Renders cards with visual states

#### Game Logic  
- `isCardPlayable(card, player)` - Validates legal plays
- `getEffectiveSuit(card)` - Handles bower trump conversion
- `canFollowSuit(hand, suit)` - Checks suit-following ability
- `evaluateTrick()` - Determines trick winner
- `getCardValue(card, trump, leadSuit)` - Card comparison values

#### AI System
- `aiPlay()` - AI card selection logic
- `aiTrumpDecision()` - Strategic trump calling
- Smart suit following with fallback strategies

## API Documentation

### Core Game Methods

#### `playCard(player, cardIndex)`
Attempts to play a card for the specified player.
```javascript
/**
 * @param {string} player - Player position ('south', 'north', 'east', 'west')
 * @param {number} cardIndex - Index of card in player's hand
 * @throws {Error} If invalid play attempt
 */
```

#### `selectTrump(suit)`  
Selects trump suit during bidding phase.
```javascript
/**
 * @param {string} suit - Trump suit ('♠', '♥', '♦', '♣')
 * @throws {Error} If invalid trump selection
 */
```

#### `getCardValue(card, trump, leadSuit)`
Returns numeric value for card comparison.
```javascript
/**
 * @param {Object} card - Card object {rank, suit, color}
 * @param {string} trump - Current trump suit
 * @param {string} leadSuit - Suit led in current trick
 * @returns {number} Card value (higher = stronger)
 */
```

### Utility Methods

#### `toTitleCase(str)`
Converts strings to proper title case.
```javascript
/**
 * @param {string} str - Input string
 * @returns {string} Title cased string
 */
```

#### `getRandomNPCProfile(player)`
Generates fun character profiles for AI players.
```javascript
/**
 * @param {string} player - Position ('north', 'east', 'west')
 * @returns {Object} {name: string, avatar: string}
 */
```

## Testing

### Test Coverage
The test suite covers all core functionality:

- ✅ **Deck Management**: 24-card creation, shuffling, dealing
- ✅ **Trump Selection**: Both rounds, validation, AI decisions  
- ✅ **Bower Logic**: Right/left bower identification and values
- ✅ **Suit Following**: Legal play validation, enforcement
- ✅ **Scoring**: All point scenarios (make, march, euchre, alone)
- ✅ **Game State**: Turn progression, win conditions
- ✅ **Full Simulation**: Complete games from start to finish
- ✅ **Edge Cases**: Error handling, invalid inputs

### Running Tests
```bash
# Run all tests
npm test

# Watch mode for development  
npm run test:watch

# Validate code quality
npm run validate
```

### Test Framework
Custom lightweight testing framework with:
- Assertion helpers (`assertEqual`, `assertTrue`, etc.)
- Mock DOM environment for headless testing
- Comprehensive game simulation
- Pretty console output with emoji formatting

## Development

### Getting Started
```bash
# Install dependencies
npm install

# Start development server
npm run dev-web

# Run linting
npm run lint

# Run tests
npm test

# Validate all (lint + test)
npm run validate
```

### Code Standards
- **ES6+ JavaScript** with comprehensive JSDoc comments
- **Mobile-first responsive** CSS design
- **Semantic HTML5** structure
- **Accessibility friendly** with ARIA labels
- **Cross-browser compatibility** (modern browsers)

### Debugging Features
- **Console Logging**: Detailed game events with emoji formatting
- **Visual States**: Clear indication of playable/disabled cards  
- **Error Handling**: Graceful failure with user-friendly messages
- **Performance**: Optimized for smooth 60fps animations

### Contributing
1. Follow existing code style and patterns
2. Add JSDoc comments for all functions
3. Include tests for new features
4. Ensure responsive design works on all screen sizes
5. Test with both mouse and touch interactions

### Deployment
- **Web**: Deployed on Vercel with automatic builds
- **Desktop**: Electron apps for Windows, Mac, Linux
- **Mobile**: Progressive Web App features

## Performance

### Optimizations
- **Lazy Loading**: Cards rendered only when visible
- **Event Delegation**: Efficient event handling
- **CSS Animations**: Hardware-accelerated transforms
- **Memory Management**: Proper cleanup of game state
- **Responsive Images**: Optimized icon assets

### Browser Support
- **Chrome/Edge**: Full support with all features
- **Firefox**: Complete compatibility  
- **Safari**: Full support including iOS
- **Mobile**: Touch-optimized interface

---

## License
MIT License - See LICENSE file for details.

## Support
For issues or questions, check the test suite and console output for debugging information.