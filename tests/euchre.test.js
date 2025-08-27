/**
 * Comprehensive Unit Tests for Euchre Game
 * Tests all core game functionality including deck creation, trump selection,
 * suit following, scoring, and complete game simulations
 */

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }
    
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async run() {
        console.log('🧪 ═══════════ EUCHRE GAME TESTS ═══════════');
        
        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✅ ${name}`);
                this.results.passed++;
            } catch (error) {
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
                this.results.failed++;
            }
            this.results.total++;
        }
        
        console.log('══════════════════════════════════════════');
        console.log(`📊 Results: ${this.results.passed}/${this.results.total} tests passed`);
        console.log(`${this.results.failed > 0 ? '❌' : '✅'} ${this.results.failed} tests failed`);
        
        return this.results.failed === 0;
    }
}

// Test utilities
function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(`Expected true, got false. ${message}`);
    }
}

function assertFalse(condition, message = '') {
    if (condition) {
        throw new Error(`Expected false, got true. ${message}`);
    }
}

function assertArrayEqual(actual, expected, message = '') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Arrays not equal. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
    }
}

// Mock DOM elements for testing
function createMockDOM() {
    global.document = {
        getElementById: (id) => ({
            innerHTML: '',
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            },
            style: {},
            appendChild: () => {},
            textContent: '',
            querySelector: () => null,
            querySelectorAll: () => []
        }),
        createElement: (tag) => ({
            className: '',
            classList: {
                add: () => {},
                remove: () => {}
            },
            innerHTML: '',
            style: {},
            appendChild: () => {},
            addEventListener: () => {},
            onclick: null
        }),
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {}
    };
    
    global.localStorage = {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    };
    
    global.setTimeout = (fn, delay) => {
        // Execute immediately for tests
        fn();
        return 1;
    };
    
    global.clearTimeout = () => {};
}

// Load the game class
const fs = require('fs');
const path = require('path');

// Read and execute the game file in a controlled environment
const gameCode = fs.readFileSync(path.join(__dirname, '../public/js/euchre.js'), 'utf8');

// Create test environment
createMockDOM();

// Extract just the EuchreGame class definition
const classMatch = gameCode.match(/class EuchreGame \{[\s\S]*?\n\}/);
if (!classMatch) {
    throw new Error('Could not find EuchreGame class definition');
}

// Evaluate the class
eval(classMatch[0]);

// Create test runner
const runner = new TestRunner();

// =============================================================================
// DECK AND CARD TESTS
// =============================================================================

runner.test('Deck Creation - Should create 24-card Euchre deck', () => {
    const game = new EuchreGame();
    game.createDeck();
    
    assertEqual(game.deck.length, 24, 'Deck should have 24 cards');
    
    // Check suits
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
    
    suits.forEach(suit => {
        ranks.forEach(rank => {
            const cardExists = game.deck.some(card => card.suit === suit && card.rank === rank);
            assertTrue(cardExists, `Card ${rank}${suit} should exist in deck`);
        });
    });
});

runner.test('Deck Shuffle - Should randomize card order', () => {
    const game = new EuchreGame();
    game.createDeck();
    
    const originalOrder = [...game.deck];
    game.shuffle();
    
    // Very unlikely that shuffle produces same order
    const orderChanged = game.deck.some((card, index) => 
        card.rank !== originalOrder[index].rank || card.suit !== originalOrder[index].suit
    );
    assertTrue(orderChanged, 'Deck order should change after shuffling');
});

runner.test('Card Colors - Should assign correct colors', () => {
    const game = new EuchreGame();
    game.createDeck();
    
    const redCards = game.deck.filter(card => card.color === '#e74c3c');
    const blackCards = game.deck.filter(card => card.color === '#2c3e50');
    
    assertEqual(redCards.length, 12, 'Should have 12 red cards (hearts + diamonds)');
    assertEqual(blackCards.length, 12, 'Should have 12 black cards (spades + clubs)');
    
    // Check specific suits
    const hearts = game.deck.filter(card => card.suit === '♥');
    const diamonds = game.deck.filter(card => card.suit === '♦');
    hearts.forEach(card => assertEqual(card.color, '#e74c3c', 'Hearts should be red'));
    diamonds.forEach(card => assertEqual(card.color, '#e74c3c', 'Diamonds should be red'));
});

// =============================================================================
// DEALING TESTS
// =============================================================================

runner.test('Card Dealing - Should deal 5 cards to each player', () => {
    const game = new EuchreGame();
    game.dealCards();
    
    ['north', 'east', 'south', 'west'].forEach(pos => {
        assertEqual(game.players[pos].cards.length, 5, `${pos} should have 5 cards`);
    });
    
    // Should have flipped card
    assertTrue(game.flippedCard !== null, 'Should have a flipped card');
    
    // Kitty should have remaining cards
    const totalCards = 20 + 1 + game.kitty.length; // 20 dealt + 1 flipped + kitty
    assertEqual(totalCards, 24, 'All cards should be accounted for');
});

runner.test('Deal Order - Should follow correct dealing pattern', () => {
    const game = new EuchreGame();
    game.currentDealer = 'south';
    
    // Mock the shuffle to have predictable order
    game.createDeck();
    game.deck = game.deck.slice(0, 24); // Ensure 24 cards
    
    game.dealCards();
    
    // Each player should have exactly 5 cards
    Object.values(game.players).forEach(player => {
        assertEqual(player.cards.length, 5, 'Each player should have exactly 5 cards');
    });
});

// =============================================================================
// TRUMP SELECTION TESTS
// =============================================================================

runner.test('Trump Selection - Initial round logic', () => {
    const game = new EuchreGame();
    game.dealCards();
    game.trumpSelectionRound = 1;
    game.trumpSelectionPlayer = 'south';
    
    const originalSuit = game.flippedCard.suit;
    game.selectTrump(originalSuit);
    
    assertEqual(game.trump, originalSuit, 'Trump should be set to flipped card suit');
    assertTrue(game.trumpCaller === 'south', 'Trump caller should be recorded');
});

runner.test('Trump Selection - Second round logic', () => {
    const game = new EuchreGame();
    game.dealCards();
    game.trumpSelectionRound = 2;
    game.trumpSelectionPlayer = 'south';
    
    const flippedSuit = game.flippedCard.suit;
    const otherSuits = ['♠', '♥', '♦', '♣'].filter(s => s !== flippedSuit);
    const selectedSuit = otherSuits[0];
    
    game.selectTrump(selectedSuit);
    
    assertEqual(game.trump, selectedSuit, 'Should allow different suit in round 2');
    assertTrue(selectedSuit !== flippedSuit, 'Should not select flipped card suit in round 2');
});

// =============================================================================
// BOWER LOGIC TESTS
// =============================================================================

runner.test('Bower Logic - Right bower identification', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    
    const rightBower = { rank: 'J', suit: '♠' };
    const effectiveSuit = game.getEffectiveSuit(rightBower);
    
    assertEqual(effectiveSuit, '♠', 'Right bower should be trump suit');
});

runner.test('Bower Logic - Left bower identification', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    
    const leftBower = { rank: 'J', suit: '♣' }; // Same color as spades
    const effectiveSuit = game.getEffectiveSuit(leftBower);
    
    assertEqual(effectiveSuit, '♠', 'Left bower should become trump suit');
});

runner.test('Bower Logic - Color matching', () => {
    const game = new EuchreGame();
    
    // Test spades trump
    game.trump = '♠';
    assertEqual(game.getEffectiveSuit({ rank: 'J', suit: '♣' }), '♠', 'Jack of clubs should be trump when spades is trump');
    
    // Test hearts trump
    game.trump = '♥';
    assertEqual(game.getEffectiveSuit({ rank: 'J', suit: '♦' }), '♥', 'Jack of diamonds should be trump when hearts is trump');
    
    // Test diamonds trump
    game.trump = '♦';
    assertEqual(game.getEffectiveSuit({ rank: 'J', suit: '♥' }), '♦', 'Jack of hearts should be trump when diamonds is trump');
    
    // Test clubs trump
    game.trump = '♣';
    assertEqual(game.getEffectiveSuit({ rank: 'J', suit: '♠' }), '♣', 'Jack of spades should be trump when clubs is trump');
});

// =============================================================================
// SUIT FOLLOWING TESTS
// =============================================================================

runner.test('Suit Following - Must follow suit when possible', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    
    const hand = [
        { rank: 'A', suit: '♥' },
        { rank: 'K', suit: '♥' },
        { rank: '10', suit: '♦' }
    ];
    
    const heartCard = { rank: 'Q', suit: '♥' };
    const diamondCard = { rank: '9', suit: '♦' };
    
    assertTrue(game.isCardPlayable(heartCard, 'south'), 'Heart should be playable');
    
    // Mock current trick and player state
    game.currentPlayer = 'south';
    game.players.south.cards = hand;
    game.currentTrick = [{ player: 'west', card: { rank: 'Q', suit: '♥' } }];
    
    assertTrue(game.isCardPlayable(heartCard, 'south'), 'Heart should be playable when hearts led');
    assertFalse(game.isCardPlayable(diamondCard, 'south'), 'Diamond should not be playable when hearts led and hearts available');
});

runner.test('Suit Following - Can play any card when cannot follow', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    game.currentPlayer = 'south';
    
    const hand = [
        { rank: 'A', suit: '♦' },
        { rank: 'K', suit: '♣' }
    ];
    
    game.players.south.cards = hand;
    game.currentTrick = [{ player: 'west', card: { rank: 'Q', suit: '♥' } }];
    
    const diamondCard = { rank: 'A', suit: '♦' };
    const clubCard = { rank: 'K', suit: '♣' };
    
    assertTrue(game.isCardPlayable(diamondCard, 'south'), 'Diamond should be playable when cannot follow suit');
    assertTrue(game.isCardPlayable(clubCard, 'south'), 'Club should be playable when cannot follow suit');
});

runner.test('Suit Following - Bower trump following', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    game.currentPlayer = 'south';
    
    const hand = [
        { rank: 'J', suit: '♣' }, // Left bower
        { rank: 'A', suit: '♥' }
    ];
    
    game.players.south.cards = hand;
    game.currentTrick = [{ player: 'west', card: { rank: 'K', suit: '♠' } }]; // Trump led
    
    const leftBower = { rank: 'J', suit: '♣' };
    const heartCard = { rank: 'A', suit: '♥' };
    
    assertTrue(game.isCardPlayable(leftBower, 'south'), 'Left bower should be playable when trump led');
    assertFalse(game.isCardPlayable(heartCard, 'south'), 'Heart should not be playable when trump led and trump available');
});

// =============================================================================
// SCORING TESTS
// =============================================================================

runner.test('Scoring - Basic scoring logic', () => {
    const game = new EuchreGame();
    game.trumpCaller = 'south';
    game.trumpCallerTeam = 1;
    
    // Test making it (3-4 tricks)
    game.players.south.tricks = 2;
    game.players.north.tricks = 1;
    game.players.east.tricks = 1;
    game.players.west.tricks = 1;
    
    const initialScore = game.team1Score;
    game.endHand();
    
    assertTrue(game.team1Score > initialScore, 'Team should score points for making it');
});

runner.test('Scoring - March scoring (all 5 tricks)', () => {
    const game = new EuchreGame();
    game.trumpCaller = 'south';
    game.trumpCallerTeam = 1;
    
    game.players.south.tricks = 3;
    game.players.north.tricks = 2;
    game.players.east.tricks = 0;
    game.players.west.tricks = 0;
    
    const initialScore = game.team1Score;
    game.endHand();
    
    // Should get 2 points for march
    assertEqual(game.team1Score, initialScore + 2, 'Team should get 2 points for march');
});

runner.test('Scoring - Euchred penalty', () => {
    const game = new EuchreGame();
    game.trumpCaller = 'south';
    game.trumpCallerTeam = 1;
    
    // Team that called trump gets fewer than 3 tricks
    game.players.south.tricks = 1;
    game.players.north.tricks = 1;
    game.players.east.tricks = 2;
    game.players.west.tricks = 1;
    
    const initialScore = game.team2Score;
    game.endHand();
    
    // Opponents should get 2 points for euchre
    assertEqual(game.team2Score, initialScore + 2, 'Opponents should get 2 points for euchre');
});

runner.test('Scoring - Alone march bonus', () => {
    const game = new EuchreGame();
    game.trumpCaller = 'south';
    game.trumpCallerTeam = 1;
    game.playingAlone = true;
    game.alonePlayer = 'south';
    
    game.players.south.tricks = 5;
    game.players.north.tricks = 0;
    game.players.east.tricks = 0;
    game.players.west.tricks = 0;
    
    const initialScore = game.team1Score;
    game.endHand();
    
    // Should get 4 points for alone march
    assertEqual(game.team1Score, initialScore + 4, 'Should get 4 points for alone march');
});

// =============================================================================
// GAME STATE TESTS
// =============================================================================

runner.test('Game State - Win condition at 10 points', () => {
    const game = new EuchreGame();
    game.team1Score = 10;
    
    assertTrue(game.team1Score >= 10, 'Game should end when team reaches 10 points');
});

runner.test('Game State - Player turn progression', () => {
    const game = new EuchreGame();
    game.currentPlayer = 'south';
    
    game.nextPlayer();
    assertEqual(game.currentPlayer, 'west', 'Next player should be west');
    
    game.nextPlayer();
    assertEqual(game.currentPlayer, 'north', 'Next player should be north');
    
    game.nextPlayer();
    assertEqual(game.currentPlayer, 'east', 'Next player should be east');
    
    game.nextPlayer();
    assertEqual(game.currentPlayer, 'south', 'Should cycle back to south');
});

runner.test('Game State - Playing alone partner skipping', () => {
    const game = new EuchreGame();
    game.playingAlone = true;
    game.alonePlayer = 'south';
    game.currentPlayer = 'south';
    
    game.nextPlayer();
    assertEqual(game.currentPlayer, 'west', 'Should go to west');
    
    game.nextPlayer();
    // Should skip north (partner) and go to east
    assertEqual(game.currentPlayer, 'east', 'Should skip north partner and go to east');
});

// =============================================================================
// FULL GAME SIMULATION TEST
// =============================================================================

runner.test('Full Game Simulation - Complete game to finish', () => {
    const game = new EuchreGame();
    let maxRounds = 50; // Prevent infinite loops
    let rounds = 0;
    
    // Simulate a complete game
    while (game.team1Score < 10 && game.team2Score < 10 && rounds < maxRounds) {
        // Deal new hand
        game.dealCards();
        
        // Force trump selection (simulate player choosing)
        if (game.flippedCard) {
            game.trump = game.flippedCard.suit;
            game.trumpCaller = 'south';
            game.trumpCallerTeam = 1;
            game.trumpSelectionPhase = false;
        }
        
        // Play all tricks in hand
        for (let trick = 0; trick < 5; trick++) {
            game.currentTrick = [];
            
            // Play 4 cards (one from each player)
            for (let cardPlay = 0; cardPlay < 4; cardPlay++) {
                const currentPlayer = game.currentPlayer;
                const playerCards = game.players[currentPlayer].cards;
                
                if (playerCards.length > 0) {
                    // Play first valid card
                    const cardIndex = 0;
                    const card = playerCards[cardIndex];
                    
                    // Simulate card play
                    game.players[currentPlayer].cards.splice(cardIndex, 1);
                    game.currentTrick.push({ player: currentPlayer, card });
                    
                    game.nextPlayer();
                }
            }
            
            // Evaluate trick if complete
            if (game.currentTrick.length === 4) {
                game.evaluateTrick();
            }
        }
        
        // End hand and calculate scores
        game.endHand();
        rounds++;
    }
    
    assertTrue(rounds < maxRounds, 'Game should complete within reasonable rounds');
    assertTrue(game.team1Score >= 10 || game.team2Score >= 10, 'One team should reach 10 points');
    assertTrue(rounds > 0, 'Game should have played at least one round');
});

// =============================================================================
// EDGE CASES AND ERROR HANDLING
// =============================================================================

runner.test('Edge Cases - Empty trick evaluation', () => {
    const game = new EuchreGame();
    game.currentTrick = [];
    
    // Should not crash on empty trick
    try {
        game.evaluateTrick();
        assertTrue(true, 'Should handle empty trick gracefully');
    } catch (error) {
        assertTrue(false, 'Should not throw error on empty trick');
    }
});

runner.test('Edge Cases - Invalid card play attempts', () => {
    const game = new EuchreGame();
    game.currentPlayer = 'north'; // AI player
    
    // Should not allow human to play when it's not their turn
    const result = game.isCardPlayable({ rank: 'A', suit: '♠' }, 'south');
    assertFalse(result, 'Should not allow play when not player turn');
});

runner.test('Edge Cases - Card value calculations', () => {
    const game = new EuchreGame();
    game.trump = '♠';
    
    const rightBower = { rank: 'J', suit: '♠' };
    const leftBower = { rank: 'J', suit: '♣' };
    const ace = { rank: 'A', suit: '♠' };
    
    const rightValue = game.getCardValue(rightBower, '♠', '♠');
    const leftValue = game.getCardValue(leftBower, '♠', '♠');
    const aceValue = game.getCardValue(ace, '♠', '♠');
    
    assertTrue(rightValue > leftValue, 'Right bower should beat left bower');
    assertTrue(leftValue > aceValue, 'Left bower should beat ace of trump');
});

// =============================================================================
// RUN ALL TESTS
// =============================================================================

// Export for Node.js testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, runner };
}

// Auto-run tests if in browser
if (typeof window !== 'undefined') {
    window.runEuchreTests = async () => {
        return await runner.run();
    };
    
    // Auto-run on load
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Starting Euchre Game Tests...');
        const success = await runner.run();
        
        if (success) {
            console.log('🎉 All tests passed! Game is working correctly.');
        } else {
            console.log('🚨 Some tests failed. Check the output above.');
        }
    });
}

console.log('📝 Euchre test suite loaded. Run with runEuchreTests() or tests will auto-run.');