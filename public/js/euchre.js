/**
 * Euchre Game Implementation
 * A complete implementation of the classic 4-player card game Euchre
 * with AI opponents, authentic rules, and mobile-responsive design.
 * 
 * @class EuchreGame
 * @author Euchre AI Development Team
 * @version 1.0.0
 */
class EuchreGame {
    /**
     * Initialize a new Euchre game with default settings
     * @constructor
     */
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
        this.currentDealer = this.getRandomDealer();
        this.currentPlayer = null;
        this.currentTrick = [];
        this.round = 1;
        this.stats = {
            handsPlayed: 0,
            gamesWon: 0,
            gamesLost: 0
        };
        this.difficulty = 'medium';
        this.playerSettings = {
            south: { name: 'You', avatar: '😊' },
            north: { name: 'North (Partner)', avatar: '🤖' },
            east: { name: 'East', avatar: '🤖' },
            west: { name: 'West', avatar: '🤖' }
        };
        this.cardBackStyle = 'classic';
        this.messageTimeout = null;
        this.trumpSelectionPhase = false;
        this.trumpSelectionPlayer = null;
        this.trumpSelectionRound = 1;
        this.flippedCard = null;
        this.passedPlayers = [];
        this.playingAlone = false;
        this.alonePlayer = null;
        this.kitty = [];
        this.canGoAlone = false;
        this.trumpTurnOrder = [];
        this.dealerDiscardPhase = false;
        
        this.init();
        this.setupSettingsEventListeners();
    }
    
    init() {
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 500);
        
        // Load stats and settings
        this.loadStats();
        this.loadSettings();
        this.updatePlayerDisplay();
        
        // Set initial dealer chip
        this.setDealerChip();
        
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
    
    // Difficulty-based AI behavior
    getAIAggressiveness() {
        switch (this.difficulty) {
            case 'easy': return { trump1: 0.2, trump2: 0.3, playSkill: 0.3 };
            case 'medium': return { trump1: 0.3, trump2: 0.5, playSkill: 0.6 };
            case 'hard': return { trump1: 0.4, trump2: 0.7, playSkill: 0.8 };
            default: return { trump1: 0.3, trump2: 0.5, playSkill: 0.6 };
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
        
        // Clear previous cards and tricks
        ['north', 'east', 'south', 'west'].forEach(pos => {
            this.players[pos].cards = [];
            this.players[pos].tricks = 0;
        });
        
        // Reset tricks display
        this.updateTricksDisplay();
        
        // Deal 5 cards to each player in clockwise order (left of dealer first)
        const dealerOrder = ['south', 'west', 'north', 'east'];
        const dealerIndex = dealerOrder.indexOf(this.currentDealer);
        const dealOrder = [];
        for (let i = 1; i <= 4; i++) {
            dealOrder.push(dealerOrder[(dealerIndex + i) % 4]);
        }
        
        // Deal in batches: first 3 to each, then 2 to each (or vice versa)
        const firstBatch = Math.random() < 0.5 ? 3 : 2;
        const secondBatch = 5 - firstBatch;
        
        // First batch
        for (let i = 0; i < firstBatch; i++) {
            dealOrder.forEach(pos => {
                this.players[pos].cards.push(this.deck.pop());
            });
        }
        
        // Second batch
        for (let i = 0; i < secondBatch; i++) {
            dealOrder.forEach(pos => {
                this.players[pos].cards.push(this.deck.pop());
            });
        }
        
        // Flip card for trump selection (traditional Euchre)
        this.flippedCard = this.deck.pop();
        
        // Remaining cards become the kitty
        this.kitty = [...this.deck];
        
        this.displayCards();
        this.displayFlippedCard();
        this.updateTricksDisplay();
        this.startTrumpSelection();
        
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
                    cardDiv.className = `card back ${this.cardBackStyle}`;
                }
                
                container.appendChild(cardDiv);
            });
        });
    }
    
    startTrumpSelection() {
        this.trumpSelectionPhase = true;
        this.trumpSelectionRound = 1;
        this.passedPlayers = [];
        
        // Start with player to left of dealer (clockwise order)
        const dealerOrder = ['south', 'west', 'north', 'east'];
        const dealerIndex = dealerOrder.indexOf(this.currentDealer);
        const leftOfDealer = dealerOrder[(dealerIndex + 1) % 4];
        
        // Turn order starting from left of dealer
        const startIndex = dealerOrder.indexOf(leftOfDealer);
        this.trumpTurnOrder = [];
        for (let i = 0; i < 4; i++) {
            this.trumpTurnOrder.push(dealerOrder[(startIndex + i) % 4]);
        }
        
        this.trumpSelectionPlayer = this.trumpTurnOrder[0];
        
        // Show flipped card
        document.getElementById('trump-display').innerHTML = 
            `Flipped Card: <span style="color: ${this.flippedCard.color}">${this.flippedCard.rank}${this.flippedCard.suit}</span>`;
        
        this.processTrumpSelection();
    }
    
    processTrumpSelection() {
        if (this.trumpSelectionPlayer === 'south') {
            // Player's turn
            if (this.trumpSelectionRound === 1) {
                this.showMessage(`Order up ${this.flippedCard.suit}? (You can also go alone)`);
                this.showTrumpSelectionDialog(true); // First round - only flipped suit or pass
            } else {
                this.showMessage('Choose trump suit (not ' + this.flippedCard.suit + ') or go alone');
                this.showTrumpSelectionDialog(false); // Second round - any other suit
            }
        } else {
            // AI turn - show correct terminology
            const playerName = this.playerSettings[this.trumpSelectionPlayer].name;
            if (this.trumpSelectionRound === 1) {
                if (this.trumpSelectionPlayer === 'north') {
                    this.showMessage(`${playerName} can "assist" or pass...`);
                } else {
                    this.showMessage(`${playerName} can "order it up" or pass...`);
                }
            } else {
                this.showMessage(`${playerName} can name trump or pass...`);
            }
            setTimeout(() => this.aiTrumpSelection(), 1500);
        }
    }
    
    aiTrumpSelection() {
        const playerName = this.playerSettings[this.trumpSelectionPlayer].name;
        const aiSettings = this.getAIAggressiveness();
        
        if (this.trumpSelectionRound === 1) {
            // First round: AI chance to order up flipped card based on difficulty
            if (Math.random() < aiSettings.trump1) {
                this.selectTrump(this.flippedCard.suit);
                this.showMessage(`${playerName} ordered up ${this.flippedCard.suit}!`);
                return;
            } else {
                this.showMessage(`${playerName} passes.`);
            }
        } else {
            // Second round: check if dealer is stuck
            if (this.trumpSelectionPlayer === this.currentDealer && this.passedPlayers.length === 3) {
                // Dealer is stuck - must choose
                const availableSuits = ['♠', '♥', '♦', '♣'].filter(s => s !== this.flippedCard.suit);
                const chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
                this.selectTrump(chosenSuit);
                this.showMessage(`${playerName} is stuck and calls ${chosenSuit} trump!`);
                return;
            } else {
                // Normal second round: AI chance to name trump based on difficulty
                if (Math.random() < aiSettings.trump2) {
                    const availableSuits = ['♠', '♥', '♦', '♣'].filter(s => s !== this.flippedCard.suit);
                    const chosenSuit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
                    this.selectTrump(chosenSuit);
                    this.showMessage(`${playerName} called ${chosenSuit} trump!`);
                    return;
                } else {
                    this.showMessage(`${playerName} passes.`);
                }
            }
        }
        
        // AI passed - move to next player
        setTimeout(() => this.nextTrumpPlayer(), 1000);
    }
    
    nextTrumpPlayer() {
        const currentIndex = this.trumpTurnOrder.indexOf(this.trumpSelectionPlayer);
        
        this.passedPlayers.push(this.trumpSelectionPlayer);
        
        if (this.passedPlayers.length === 4) {
            // Everyone passed first round
            if (this.trumpSelectionRound === 1) {
                this.trumpSelectionRound = 2;
                this.passedPlayers = [];
                this.trumpSelectionPlayer = this.trumpTurnOrder[0]; // Start second round with same order
                this.showMessage('Second round of trump selection...');
                setTimeout(() => this.processTrumpSelection(), 1500);
            } else {
                // Everyone passed second round - redeal (shouldn't happen with stick the dealer)
                this.showMessage('Everyone passed - redealing...');
                setTimeout(() => this.dealCards(), 2000);
            }
        } else if (this.trumpSelectionRound === 2 && this.passedPlayers.length === 3) {
            // Stick the dealer - dealer must choose trump
            this.trumpSelectionPlayer = this.currentDealer;
            const dealerName = this.playerSettings[this.currentDealer].name;
            this.showMessage(`Stick the dealer! ${dealerName} must choose trump.`);
            setTimeout(() => this.processTrumpSelection(), 1500);
        } else {
            // Next player
            this.trumpSelectionPlayer = this.trumpTurnOrder[(currentIndex + 1) % 4];
            this.processTrumpSelection();
        }
    }
    
    showTrumpSelectionDialog(firstRound) {
        const dialog = document.getElementById('trump-selection');
        const options = dialog.querySelector('.trump-options');
        const aloneOption = document.getElementById('alone-option');
        
        if (firstRound) {
            // First round: show flipped suit only
            options.innerHTML = `
                <div class="trump-option" onclick="game.selectTrump('${this.flippedCard.suit}')" style="color: ${this.flippedCard.color}">${this.flippedCard.suit}</div>
            `;
            dialog.querySelector('h3').textContent = `Order up ${this.flippedCard.suit}?`;
        } else {
            // Second round: all suits except flipped
            const availableSuits = [
                { suit: '♠', color: '#2c3e50' },
                { suit: '♥', color: '#e74c3c' },
                { suit: '♦', color: '#e74c3c' },
                { suit: '♣', color: '#2c3e50' }
            ].filter(s => s.suit !== this.flippedCard.suit);
            
            options.innerHTML = availableSuits.map(s => 
                `<div class="trump-option" onclick="game.selectTrump('${s.suit}')" style="color: ${s.color}">${s.suit}</div>`
            ).join('');
            dialog.querySelector('h3').textContent = 'Choose Trump Suit';
        }
        
        // Hide alone option initially
        aloneOption.style.display = 'none';
        this.canGoAlone = false;
        
        dialog.classList.add('active');
    }
    
    hideTrumpSelection() {
        document.getElementById('trump-selection').classList.remove('active');
    }
    
    /**
     * Select trump suit and handle dealer pickup mechanics
     * @param {string} suit - The trump suit (♠, ♥, ♦, ♣)
     */
    selectTrump(suit) {
        this.trump = suit;
        
        // If it's the player's turn, show alone option
        if (this.trumpSelectionPlayer === 'south') {
            this.canGoAlone = true;
            document.getElementById('alone-option').style.display = 'block';
            document.getElementById('trump-display').innerHTML = 
                `Trump: <span style="color: ${suit === '♥' || suit === '♦' ? '#e74c3c' : '#2c3e50'}">${suit}</span>`;
            this.showMessage('Trump selected! Go alone or continue?');
            return;
        }
        
        // AI selected trump - now handle dealer pickup
        this.trumpSelectionPhase = false;
        this.hideTrumpSelection();
        
        document.getElementById('trump-display').innerHTML = 
            `Trump: <span style="color: ${suit === '♥' || suit === '♦' ? '#e74c3c' : '#2c3e50'}">${suit}</span>`;
        
        // Handle dealer pickup if trump was selected in first round
        if (this.trumpSelectionRound === 1) {
            this.handleDealerPickup();
        } else {
            this.hideFlippedCard();
            this.startPlay();
        }
    }
    
    declareAlone() {
        this.playingAlone = true;
        this.alonePlayer = 'south';
        this.trumpSelectionPhase = false;
        this.hideTrumpSelection();
        
        // Mark partner as sitting out
        document.getElementById('north-avatar').classList.add('sitting-out');
        
        document.getElementById('trump-display').innerHTML = 
            `Trump: <span style="color: ${this.trump === '♥' || this.trump === '♦' ? '#e74c3c' : '#2c3e50'}">${this.trump}</span> <span style="color: gold; font-weight: bold;">(ALONE)</span>`;
        
        this.showMessage(`${this.playerSettings.south.name} is playing alone! ${this.playerSettings.north.name} sits out.`);
        
        // Handle dealer pickup if trump was selected in first round
        if (this.trumpSelectionRound === 1) {
            this.handleDealerPickup();
        } else {
            this.hideFlippedCard();
            this.startPlay();
        }
    }
    
    startPlay() {
        // Start play with player to left of dealer
        setTimeout(() => {
            const dealerOrder = ['south', 'west', 'north', 'east'];
            const dealerIndex = dealerOrder.indexOf(this.currentDealer);
            this.currentPlayer = dealerOrder[(dealerIndex + 1) % 4];
            
            // Skip partner if playing alone
            if (this.playingAlone && this.alonePlayer === 'south' && this.currentPlayer === 'north') {
                this.currentPlayer = dealerOrder[(dealerIndex + 2) % 4];
            }
            
            if (this.players[this.currentPlayer].isAI) {
                setTimeout(() => this.aiPlay(), 1000);
            } else {
                this.showMessage("Your turn! Click a card to play.");
            }
        }, 1500);
    }
    
    continueWithPartner() {
        // Player chose trump but not alone
        this.trumpSelectionPhase = false;
        this.hideTrumpSelection();
        
        // Handle dealer pickup if trump was selected in first round
        if (this.trumpSelectionRound === 1) {
            this.handleDealerPickup();
        } else {
            this.hideFlippedCard();
            this.startPlay();
        }
    }
    
    passTrump() {
        if (this.canGoAlone) {
            // Player is in the trump selection with alone option, continue normally
            this.continueWithPartner();
        } else {
            // Normal pass
            this.hideTrumpSelection();
            this.nextTrumpPlayer();
        }
    }
    
    playCard(player, cardIndex) {
        if (player !== this.currentPlayer) {
            this.showMessage("It's not your turn!");
            return;
        }
        
        // Skip if partner is trying to play when someone is alone
        if (this.playingAlone && this.alonePlayer === 'south' && player === 'north') {
            this.showMessage("Your partner sits out when you play alone!");
            return;
        }
        
        const card = this.players[player].cards[cardIndex];
        this.players[player].cards.splice(cardIndex, 1);
        
        this.currentTrick.push({ player, card });
        this.displayTrick();
        this.displayCards();
        
        // Check if trick is complete (3 cards when playing alone, 4 normally)
        const expectedCards = this.playingAlone ? 3 : 4;
        if (this.currentTrick.length === expectedCards) {
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
            cardDiv.className = `trick-card player-${play.player}`;
            cardDiv.innerHTML = `<span style="color:${play.card.color}; font-weight: bold;">${play.card.rank}${play.card.suit}</span>`;
            
            // Add player name label
            const playerLabel = document.createElement('div');
            playerLabel.style.cssText = 'position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; color: white; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 10px; white-space: nowrap;';
            playerLabel.textContent = this.playerSettings[play.player].name;
            cardDiv.appendChild(playerLabel);
            
            centerArea.appendChild(cardDiv);
        });
        
        // Update tricks display after each card is played
        this.updateTricksDisplay();
    }
    
    nextPlayer() {
        const players = ['south', 'west', 'north', 'east'];
        const currentIndex = players.indexOf(this.currentPlayer);
        this.currentPlayer = players[(currentIndex + 1) % 4];
        
        // Skip partner if playing alone
        if (this.playingAlone && this.alonePlayer === 'south' && this.currentPlayer === 'north') {
            this.currentPlayer = players[(players.indexOf(this.currentPlayer) + 1) % 4];
        }
        
        if (this.players[this.currentPlayer].isAI) {
            setTimeout(() => this.aiPlay(), 1000);
        } else if (this.currentPlayer === 'south') {
            this.showMessage("Your turn! Click a card to play.");
        }
    }
    
    aiPlay() {
        const player = this.currentPlayer;
        const cards = this.players[player].cards;
        
        if (cards.length === 0) return;
        
        // Skip if this is the partner of someone playing alone
        if (this.playingAlone && this.alonePlayer === 'south' && player === 'north') {
            this.nextPlayer();
            return;
        }
        
        // Improved AI: follow suit if possible, otherwise play lowest card
        let cardIndex = 0;
        
        if (this.currentTrick.length > 0) {
            const leadSuit = this.currentTrick[0].card.suit;
            const followCards = cards.filter((card, idx) => {
                // Can follow suit
                if (card.suit === leadSuit) return true;
                // Left bower of trump can follow trump lead
                if (leadSuit === this.trump) {
                    const sameColor = (this.trump === '♠' && card.suit === '♣') ||
                                    (this.trump === '♣' && card.suit === '♠') ||
                                    (this.trump === '♥' && card.suit === '♦') ||
                                    (this.trump === '♦' && card.suit === '♥');
                    return card.rank === 'J' && sameColor;
                }
                return false;
            });
            
            if (followCards.length > 0) {
                // Play lowest following card
                const followCard = followCards[0];
                cardIndex = cards.indexOf(followCard);
            } else {
                // Play lowest card
                cardIndex = 0;
            }
        } else {
            // Leading - play a middle-value card
            cardIndex = Math.floor(cards.length / 2);
        }
        
        this.playCard(player, cardIndex);
    }
    
    getCardValue(card, trump, leadSuit) {
        // Jacks in Euchre
        if (card.rank === 'J') {
            if (card.suit === trump) {
                return 1000; // Right bower (Jack of trump)
            }
            // Left bower (Jack of same color as trump)
            const sameColor = (trump === '♠' && card.suit === '♣') ||
                            (trump === '♣' && card.suit === '♠') ||
                            (trump === '♥' && card.suit === '♦') ||
                            (trump === '♦' && card.suit === '♥');
            if (sameColor) {
                return 999; // Left bower
            }
        }
        
        // Trump suit (excluding jacks, handled above)
        if (card.suit === trump && card.rank !== 'J') {
            const values = { 'A': 900, 'K': 800, 'Q': 700, '10': 600, '9': 500 };
            return values[card.rank];
        }
        
        // Following lead suit
        if (card.suit === leadSuit && card.suit !== trump) {
            const values = { 'A': 400, 'K': 300, 'Q': 200, 'J': 150, '10': 100, '9': 50 };
            return values[card.rank];
        }
        
        // Off suit
        return 0;
    }
    
    evaluateTrick() {
        if (this.currentTrick.length === 0) return;
        
        const leadSuit = this.currentTrick[0].card.suit;
        let winner = this.currentTrick[0];
        let highestValue = this.getCardValue(winner.card, this.trump, leadSuit);
        
        for (let i = 1; i < this.currentTrick.length; i++) {
            const cardValue = this.getCardValue(this.currentTrick[i].card, this.trump, leadSuit);
            if (cardValue > highestValue) {
                highestValue = cardValue;
                winner = this.currentTrick[i];
            }
        }
        
        this.players[winner.player].tricks++;
        
        // Update tricks display immediately after trick is won
        this.updateTricksDisplay();
        
        const winnerName = this.playerSettings[winner.player].name;
        this.showMessage(`${winnerName} wins the trick!`);
        
        setTimeout(() => {
            document.getElementById('center-area').innerHTML = '';
            this.currentTrick = [];
            
            if (this.players['south'].cards.length === 0) {
                this.endHand();
            } else {
                this.currentPlayer = winner.player;
                
                // Skip partner if playing alone
                if (this.playingAlone && this.alonePlayer === 'south' && this.currentPlayer === 'north') {
                    const players = ['south', 'west', 'north', 'east'];
                    const currentIndex = players.indexOf(this.currentPlayer);
                    this.currentPlayer = players[(currentIndex + 1) % 4];
                }
                
                if (this.players[this.currentPlayer].isAI) {
                    setTimeout(() => this.aiPlay(), 500);
                } else {
                    this.showMessage("Your turn! Click a card to play.");
                }
            }
        }, 2000);
    }
    
    endHand() {
        const team1Tricks = this.players.south.tricks + this.players.north.tricks;
        const team2Tricks = this.players.east.tricks + this.players.west.tricks;
        
        let points = 0;
        let message = '';
        
        // Determine who made trump (for now, assume team that called trump)
        const team1MadeTrump = (this.alonePlayer === 'south' || this.alonePlayer === 'north');
        const team2MadeTrump = (this.alonePlayer === 'east' || this.alonePlayer === 'west');
        
        if (this.playingAlone) {
            // Lone hand scoring
            if (this.alonePlayer === 'south') {
                if (team1Tricks === 5) {
                    points = 4; // March while alone
                    message = 'You marched alone! +4 points!';
                } else if (team1Tricks >= 3) {
                    points = 1; // Made it alone but didn't march
                    message = 'You made it alone! +1 point!';
                } else {
                    points = -2; // Euchred while alone
                    this.team2Score += 2;
                    message = 'You were euchred while alone! Opponents +2 points!';
                }
                if (points > 0) this.team1Score += points;
            } else {
                // AI playing alone (simplified)
                const alonePlayerName = this.playerSettings[this.alonePlayer].name;
                if (team2Tricks === 5) {
                    this.team2Score += 4;
                    message = `${alonePlayerName} marched alone! +4 points!`;
                } else if (team2Tricks >= 3) {
                    this.team2Score += 1;
                    message = `${alonePlayerName} made it alone! +1 point!`;
                } else {
                    this.team1Score += 2;
                    message = `${alonePlayerName} was euchred while alone! ${this.playerSettings.south.name} & ${this.playerSettings.north.name} get +2 points!`;
                }
            }
        } else {
            // Normal hand scoring
            if (team1Tricks >= 3) {
                if (team1Tricks === 5) {
                    points = 2; // March
                    message = `${this.playerSettings.south.name} & ${this.playerSettings.north.name} marched! +2 points!`;
                } else {
                    points = 1; // Made it
                    message = `${this.playerSettings.south.name} & ${this.playerSettings.north.name} made it! +1 point!`;
                }
                this.team1Score += points;
            } else {
                // Team 1 was euchred
                points = 2;
                this.team2Score += points;
                message = `${this.playerSettings.south.name} & ${this.playerSettings.north.name} were euchred! ${this.playerSettings.east.name} & ${this.playerSettings.west.name} get +2 points!`;
            }
        }
        
        this.showMessage(message);
        this.updateScore();
        
        if (this.team1Score >= 10) {
            this.endGame(true);
        } else if (this.team2Score >= 10) {
            this.endGame(false);
        } else {
            this.round++;
            this.playingAlone = false;
            this.alonePlayer = null;
            
            // Remove sitting out status
            document.getElementById('north-avatar').classList.remove('sitting-out');
            
            this.rotateDealerChip();
            setTimeout(() => this.dealCards(), 3000);
        }
    }
    
    endGame(team1Won) {
        if (team1Won) {
            this.stats.gamesWon++;
            this.showMessage(`🎉 ${this.playerSettings.south.name} & ${this.playerSettings.north.name} win the game! 🎉`);
        } else {
            this.stats.gamesLost++;
            this.showMessage(`Game over - ${this.playerSettings.east.name} & ${this.playerSettings.west.name} win!`);
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
        this.trump = null;
        this.trumpSelectionPhase = false;
        this.trumpSelectionPlayer = null;
        this.trumpSelectionRound = 1;
        this.flippedCard = null;
        this.passedPlayers = [];
        this.playingAlone = false;
        this.alonePlayer = null;
        this.kitty = [];
        this.canGoAlone = false;
        
        // Remove sitting out status
        document.getElementById('north-avatar').classList.remove('sitting-out');
        
        this.hideTrumpSelection();
        this.setDealerChip();
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
        
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Set new timeout for 5 seconds
        this.messageTimeout = setTimeout(() => {
            msg.className = 'message';
        }, 5000);
        
        // Allow clicking to dismiss immediately
        msg.onclick = () => {
            msg.className = 'message';
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
        };
    }
    
    updateTricksDisplay() {
        const team1Tricks = this.players.south.tricks + this.players.north.tricks;
        const team2Tricks = this.players.east.tricks + this.players.west.tricks;
        
        document.getElementById('team1-tricks').textContent = team1Tricks;
        document.getElementById('team2-tricks').textContent = team2Tricks;
    }
    
    displayFlippedCard() {
        const flippedCardEl = document.getElementById('flipped-card');
        const flippedDisplay = document.getElementById('flipped-card-display');
        const kittyStack = document.getElementById('kitty-stack');
        
        if (this.flippedCard && flippedCardEl && flippedDisplay) {
            flippedCardEl.innerHTML = `<span style="color:${this.flippedCard.color}; font-weight: bold;">${this.flippedCard.rank}${this.flippedCard.suit}</span>`;
            flippedDisplay.classList.add('active');
            
            // Show kitty as just the face-down card stack (no count)
            if (kittyStack) {
                kittyStack.removeAttribute('data-count');
            }
        } else if (flippedDisplay) {
            flippedDisplay.classList.remove('active');
        }
    }
    
    hideFlippedCard() {
        document.getElementById('flipped-card-display').classList.remove('active');
    }
    
    handleDealerPickup() {
        // Dealer must pick up the flipped card and discard one
        if (this.currentDealer === 'south') {
            // Human dealer - show discard dialog
            this.players.south.cards.push(this.flippedCard);
            this.dealerDiscardPhase = true;
            this.showDealerDiscardDialog();
        } else {
            // AI dealer - automatically discard lowest card
            this.players[this.currentDealer].cards.push(this.flippedCard);
            const discardCard = this.getAIDealerDiscard(this.currentDealer);
            const cardIndex = this.players[this.currentDealer].cards.findIndex(c => 
                c.suit === discardCard.suit && c.rank === discardCard.rank
            );
            this.players[this.currentDealer].cards.splice(cardIndex, 1);
            
            const playerName = this.playerSettings[this.currentDealer].name;
            this.showMessage(`${playerName} picked up the ${this.flippedCard.rank}${this.flippedCard.suit} and discarded.`);
            
            this.hideFlippedCard();
            this.startPlay();
        }
    }
    
    showDealerDiscardDialog() {
        const dialog = document.getElementById('dealer-discard');
        const handContainer = document.getElementById('dealer-hand');
        
        // Show all dealer's cards for discard selection
        handContainer.innerHTML = '';
        this.players.south.cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.innerHTML = `${card.rank}<br>${card.suit}`;
            cardElement.style.color = card.color;
            cardElement.onclick = () => this.discardCard(index);
            handContainer.appendChild(cardElement);
        });
        
        dialog.classList.add('active');
    }
    
    discardCard(cardIndex) {
        // Remove selected card and continue
        const discardedCard = this.players.south.cards.splice(cardIndex, 1)[0];
        this.dealerDiscardPhase = false;
        document.getElementById('dealer-discard').classList.remove('active');
        
        this.showMessage(`You discarded the ${discardedCard.rank}${discardedCard.suit}.`);
        this.displayCards();
        
        this.hideFlippedCard();
        this.startPlay();
    }
    
    getAIDealerDiscard(dealer) {
        // AI logic to discard worst card (not trump, lowest value)
        const cards = this.players[dealer].cards;
        let worstCard = cards[0];
        let worstValue = this.getCardValue(worstCard, this.trump, null);
        
        for (let i = 1; i < cards.length; i++) {
            const value = this.getCardValue(cards[i], this.trump, null);
            if (value < worstValue) {
                worstValue = value;
                worstCard = cards[i];
            }
        }
        
        return worstCard;
    }
    
    setupSettingsEventListeners() {
        // Setup avatar selection for all players
        ['south', 'north', 'east', 'west'].forEach(player => {
            const avatarOptions = document.querySelectorAll(`#${player}-avatars .avatar-option`);
            avatarOptions.forEach(option => {
                option.onclick = () => this.selectAvatar(player, option.dataset.avatar, option);
            });
        });
        
        // Setup card back selection
        const cardBackOptions = document.querySelectorAll('.card-back-option');
        cardBackOptions.forEach(option => {
            option.onclick = () => this.selectCardBack(option.dataset.back, option);
        });
    }
    
    selectAvatar(player, avatar, optionElement) {
        // Remove selected class from all options for this player
        document.querySelectorAll(`#${player}-avatars .avatar-option`).forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        optionElement.classList.add('selected');
        
        // Update preview
        document.getElementById(`${player}-preview`).textContent = avatar;
    }
    
    /**
     * Select card back style theme with intricate patterns
     * @param {string} backStyle - The card back theme (classic, red, green, purple, gold)
     * @param {HTMLElement} optionElement - The clicked option element
     */
    selectCardBack(backStyle, optionElement) {
        // Remove selected class from all card back options
        document.querySelectorAll('.card-back-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        optionElement.classList.add('selected');
        
        // Update card back style
        this.cardBackStyle = backStyle;
        this.updateCardBacks();
    }
    
    updateCardBacks() {
        // Update all face-down cards with new back style
        document.querySelectorAll('.card.back').forEach(card => {
            // Remove existing back style classes
            card.classList.remove('classic', 'red', 'green', 'purple', 'gold');
            // Add new back style class
            card.classList.add(this.cardBackStyle);
        });
    }
    
    showSettings() {
        // Load current settings into the form
        ['south', 'north', 'east', 'west'].forEach(player => {
            document.getElementById(`${player}-name`).value = this.playerSettings[player].name;
            
            // Select current avatar
            document.querySelectorAll(`#${player}-avatars .avatar-option`).forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.avatar === this.playerSettings[player].avatar) {
                    opt.classList.add('selected');
                }
            });
            
            document.getElementById(`${player}-preview`).textContent = this.playerSettings[player].avatar;
        });
        
        // Load current card back selection
        document.querySelectorAll('.card-back-option').forEach(opt => {
            opt.classList.remove('selected');
            if (opt.dataset.back === this.cardBackStyle) {
                opt.classList.add('selected');
            }
        });
        
        document.getElementById('settings-panel').classList.add('active');
    }
    
    hideSettings() {
        document.getElementById('settings-panel').classList.remove('active');
    }
    
    saveSettings() {
        // Save name and avatar settings
        ['south', 'north', 'east', 'west'].forEach(player => {
            const name = document.getElementById(`${player}-name`).value.trim() || this.playerSettings[player].name;
            const selectedAvatar = document.querySelector(`#${player}-avatars .avatar-option.selected`);
            const avatar = selectedAvatar ? selectedAvatar.dataset.avatar : this.playerSettings[player].avatar;
            
            this.playerSettings[player] = { name, avatar };
        });
        
        // Update display immediately
        this.updatePlayerDisplay();
        
        // Save to localStorage
        try {
            localStorage.setItem('euchre-player-settings', JSON.stringify(this.playerSettings));
            localStorage.setItem('euchre-card-back', this.cardBackStyle);
        } catch (e) {
            console.error('Error saving settings:', e);
        }
        
        this.hideSettings();
        this.showMessage('Settings saved!');
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('euchre-player-settings');
            if (saved) {
                this.playerSettings = { ...this.playerSettings, ...JSON.parse(saved) };
            }
            
            const savedCardBack = localStorage.getItem('euchre-card-back');
            if (savedCardBack) {
                this.cardBackStyle = savedCardBack;
                this.updateCardBacks();
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
    
    setDealerChip() {
        // Remove dealer class from all avatars
        ['south', 'north', 'east', 'west'].forEach(player => {
            const avatar = document.getElementById(`${player}-avatar`);
            if (avatar) {
                avatar.classList.remove('dealer');
            }
        });
        
        // Add dealer class to current dealer
        const dealerAvatar = document.getElementById(`${this.currentDealer}-avatar`);
        if (dealerAvatar) {
            dealerAvatar.classList.add('dealer');
        }
    }
    
    rotateDealerChip() {
        // Rotate dealer clockwise
        const dealerOrder = ['south', 'west', 'north', 'east'];
        const currentIndex = dealerOrder.indexOf(this.currentDealer);
        this.currentDealer = dealerOrder[(currentIndex + 1) % 4];
        
        // Update dealer chip display
        this.setDealerChip();
    }
    
    updatePlayerDisplay() {
        ['south', 'north', 'east', 'west'].forEach(player => {
            const avatar = document.getElementById(`${player}-avatar`);
            const name = document.querySelector(`.player-position.${this.getPositionClass(player)} .player-name`);
            
            if (avatar) {
                avatar.textContent = this.playerSettings[player].avatar;
            }
            
            if (name) {
                name.textContent = this.playerSettings[player].name;
            }
        });
        
        // Update team labels in scoreboard
        document.getElementById('team1-label').textContent = 
            `${this.playerSettings.south.name} & ${this.playerSettings.north.name}`;
        document.getElementById('team2-label').textContent = 
            `${this.playerSettings.east.name} & ${this.playerSettings.west.name}`;
            
        // Update tricks display labels
        document.getElementById('team1-tricks-label').textContent = 
            `${this.playerSettings.south.name} & ${this.playerSettings.north.name}:`;
        document.getElementById('team2-tricks-label').textContent = 
            `${this.playerSettings.east.name} & ${this.playerSettings.west.name}:`;
            
        // Update flipped card display
        this.displayFlippedCard();
    }
    
    getPositionClass(player) {
        const positions = {
            south: 'bottom',
            north: 'top',
            east: 'right',
            west: 'left'
        };
        return positions[player];
    }
    
    getRandomDealer() {
        const players = ['south', 'west', 'north', 'east'];
        return players[Math.floor(Math.random() * players.length)];
    }
    
    showHelp() {
        this.showMessage('Euchre: First team to 10 points wins!');
    }
}

// Initialize game
window.game = new EuchreGame();