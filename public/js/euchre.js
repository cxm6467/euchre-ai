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
        this.gamePhase = 'setup';
        this.soundEnabled = true;
        
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
    
    /**
     * Load game statistics from either Electron API or server endpoint
     * Supports both desktop and web deployment environments
     * @async
     * @returns {Promise<void>}
     */
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
        
        // Clear previous cards and reset tricks
        ['north', 'east', 'south', 'west'].forEach(pos => {
            this.players[pos].cards = [];
            this.players[pos].tricks = 0;
        });
        
        // Update display to show reset tricks
        this.updateScore();
        
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
        
        // Debug: Check card counts
        console.log('🃏 ═══════════ CARD DEAL SUMMARY ═══════════');
        ['south', 'west', 'north', 'east'].forEach(pos => {
            const player = this.playerSettings[pos]?.name || pos;
            const avatar = this.playerSettings[pos]?.avatar || '🤖';
            console.log(`${avatar} ${player.padEnd(15)} │ ${this.players[pos].cards.length} cards`);
        });
        console.log('────────────────────────────────────────────');
        console.log(`🎯 Flipped card: ${this.flippedCard ? `${this.flippedCard.rank}${this.flippedCard.suit}` : 'None'}`);
        console.log(`🃟 Kitty: ${this.kitty.length} cards remaining`);
        console.log('═══════════════════════════════════════════');
        
        this.displayCards();
        this.displayFlippedCard();
        this.displayKitty();
        this.updateScore();
        this.startTrumpSelection();
        
        this.stats.handsPlayed++;
        this.updateStats();
        this.saveStats();
    }
    
    displayCards() {
        ['north', 'east', 'south', 'west'].forEach(position => {
            const container = document.getElementById(`${position}-cards`);
            container.innerHTML = '';
            // Clear must-follow class from container
            container.classList.remove('must-follow');
            
            this.players[position].cards.forEach((card, index) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                
                if (position === 'south') {
                    cardDiv.innerHTML = `
                        <div class="card-content">
                            <div class="card-corner top-left">
                                <div class="rank" style="color:${card.color}">${card.rank}</div>
                                <div class="suit" style="color:${card.color}">${card.suit}</div>
                            </div>
                            <div class="card-center" style="color:${card.color}">
                                ${card.suit}
                            </div>
                            <div class="card-corner bottom-right">
                                <div class="rank rotated" style="color:${card.color}">${card.rank}</div>
                                <div class="suit rotated" style="color:${card.color}">${card.suit}</div>
                            </div>
                        </div>
                    `;
                    
                    // Only apply visual states when it's the human player's turn
                    if (this.currentPlayer === 'south') {
                        const isPlayable = this.isCardPlayable(card, position);
                        const mustFollowSuit = this.currentTrick.length > 0;
                        
                        console.log(`🃏 Card ${card.rank}${card.suit} - Playable: ${isPlayable ? '✅' : '❌'}`);
                        
                        if (!isPlayable) {
                            cardDiv.classList.add('disabled');
                            console.log(`🚫 Disabled card: ${card.rank}${card.suit}`);
                        } else if (mustFollowSuit) {
                            cardDiv.classList.add('playable');
                            container.classList.add('must-follow');
                            console.log(`✨ Playable card: ${card.rank}${card.suit}`);
                        }
                        
                        if (isPlayable) {
                            cardDiv.onclick = () => this.playCard(position, index);
                        }
                    } else {
                        // Always clickable when not player's turn (for normal game flow)
                        cardDiv.onclick = () => this.playCard(position, index);
                    }
                } else {
                    cardDiv.className = 'card back classic';
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
                
                // Check if AI should go alone - higher chance for partner (north), lower for opponents
                let aloneChance = 0;
                if (this.trumpSelectionPlayer === 'north') {
                    aloneChance = 0.15; // 15% chance for partner
                } else if (this.trumpSelectionPlayer === 'east' || this.trumpSelectionPlayer === 'west') {
                    aloneChance = 0.08; // 8% chance for opponents
                }
                
                if (Math.random() < aloneChance) {
                    this.playingAlone = true;
                    this.alonePlayer = this.trumpSelectionPlayer;
                    this.showMessage(`${playerName} ordered up the ${this.flippedCard.rank}${this.flippedCard.suit} and is going alone! 🎯`);
                } else {
                    this.showMessage(`${playerName} ordered up the ${this.flippedCard.rank}${this.flippedCard.suit}!`);
                }
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
                    
                    // Check if AI should go alone - lower chances in round 2
                    let aloneChance = 0;
                    if (this.trumpSelectionPlayer === 'north') {
                        aloneChance = 0.10; // 10% chance for partner
                    } else if (this.trumpSelectionPlayer === 'east' || this.trumpSelectionPlayer === 'west') {
                        aloneChance = 0.05; // 5% chance for opponents
                    }
                    
                    if (Math.random() < aloneChance) {
                        this.playingAlone = true;
                        this.alonePlayer = this.trumpSelectionPlayer;
                        this.showMessage(`${playerName} called ${chosenSuit} trump and is going alone! 🎯`);
                    } else {
                        this.showMessage(`${playerName} called ${chosenSuit} trump!`);
                    }
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
            // First round: show mini card version
            options.innerHTML = `
                <div class="trump-option trump-card-option" onclick="game.selectTrump('${this.flippedCard.suit}')">
                    <div class="mini-card" style="color: ${this.flippedCard.color}; border-color: ${this.flippedCard.color};">
                        <div class="mini-card-corner top-left">
                            <div class="mini-rank">${this.flippedCard.rank}</div>
                            <div class="mini-suit">${this.flippedCard.suit}</div>
                        </div>
                        <div class="mini-card-center">${this.flippedCard.suit}</div>
                        <div class="mini-card-corner bottom-right">
                            <div class="mini-rank rotated">${this.flippedCard.rank}</div>
                            <div class="mini-suit rotated">${this.flippedCard.suit}</div>
                        </div>
                    </div>
                </div>
            `;
            const dealerName = this.playerSettings[this.currentDealer]?.name || this.currentDealer;
            const dealerAvatar = this.playerSettings[this.currentDealer]?.avatar || '🤖';
            dialog.querySelector('h3').innerHTML = `Order up the ${this.flippedCard.rank}${this.flippedCard.suit} to ${dealerAvatar} ${dealerName}?`;
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
        this.hideKitty();
        
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
        this.hideKitty();
        
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
        // Set game phase to enable turn indicator
        this.gamePhase = 'play';
        
        
        // Start play with player to left of dealer
        setTimeout(() => {
            const dealerOrder = ['south', 'west', 'north', 'east'];
            const dealerIndex = dealerOrder.indexOf(this.currentDealer);
            this.currentPlayer = dealerOrder[(dealerIndex + 1) % 4];
            
            // Skip partner if playing alone
            if (this.playingAlone) {
                const alonePlayerPartner = this.getPartner(this.alonePlayer);
                if (this.currentPlayer === alonePlayerPartner) {
                    this.currentPlayer = dealerOrder[(dealerIndex + 2) % 4];
                }
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
        this.hideKitty();
        
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
        if (this.playingAlone) {
            const alonePlayerPartner = this.getPartner(this.alonePlayer);
            if (player === alonePlayerPartner) {
                const alonePlayerName = this.playerSettings[this.alonePlayer].name;
                if (player === 'south') {
                    this.showMessage(`Your partner ${alonePlayerName} is playing alone!`);
                } else {
                    this.showMessage(`${this.playerSettings[player].name} sits out while ${alonePlayerName} plays alone.`);
                }
                return;
            }
        }
        
        const card = this.players[player].cards[cardIndex];
        
        // Check if player must follow suit (only applies to human player)
        if (player === 'south' && this.currentTrick.length > 0) {
            const leadCard = this.currentTrick[0].card;
            const leadSuit = this.getEffectiveSuit(leadCard);
            const canFollow = this.canFollowSuit(this.players[player].cards, leadSuit);
            const playedCardSuit = this.getEffectiveSuit(card);
            
            console.log(`⚖️ ────── SUIT ENFORCEMENT CHECK ──────`);
            console.log(`🎯 Lead card: ${leadCard.rank}${leadCard.suit} (effective: ${leadSuit})`);
            console.log(`🎴 Played card: ${card.rank}${card.suit} (effective: ${playedCardSuit})`);
            console.log(`🤔 Can follow suit: ${canFollow ? '✅ Yes' : '❌ No'}`);
            
            if (canFollow && playedCardSuit !== leadSuit) {
                console.log(`🚫 ILLEGAL PLAY: Must follow ${leadSuit}!`);
                this.showMessage(`You must follow suit (${leadSuit})!`);
                return;
            }
            console.log(`✅ Legal play accepted`);
            console.log(`──────────────────────────────────────`);
        }
        
        this.players[player].cards.splice(cardIndex, 1);
        
        this.currentTrick.push({ player, card });
        
        // Play card sound effect
        this.playSound('cardPlay');
        
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
        if (!centerArea) return; // Exit if center area doesn't exist
        
        try {
            centerArea.innerHTML = '';
            
            if (!this.currentTrick || !Array.isArray(this.currentTrick)) return;
            
            this.currentTrick.forEach((play, index) => {
                if (!play || !play.card || !play.player) return;
                
                const cardDiv = document.createElement('div');
                cardDiv.className = `trick-card player-${play.player}`;
                
                cardDiv.innerHTML = `
                    <div class="card-content">
                        <div class="card-corner top-left">
                            <div class="rank" style="color:${play.card.color || '#000'}">${play.card.rank || ''}</div>
                            <div class="suit" style="color:${play.card.color || '#000'}">${play.card.suit || ''}</div>
                        </div>
                        <div class="card-center" style="color:${play.card.color || '#000'}">
                            ${play.card.suit || ''}
                        </div>
                        <div class="card-corner bottom-right">
                            <div class="rank rotated" style="color:${play.card.color || '#000'}">${play.card.rank || ''}</div>
                            <div class="suit rotated" style="color:${play.card.color || '#000'}">${play.card.suit || ''}</div>
                        </div>
                    </div>
                `;
                
                // Add player name label if player exists in settings
                if (this.playerSettings[play.player]) {
                    const playerLabel = document.createElement('div');
                    playerLabel.style.cssText = 'position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); font-size: 12px; color: white; background: rgba(0,0,0,0.7); padding: 2px 8px; border-radius: 10px; white-space: nowrap;';
                    playerLabel.textContent = this.playerSettings[play.player].name || play.player;
                    cardDiv.appendChild(playerLabel);
                }
                
                centerArea.appendChild(cardDiv);
            });
            
            // Update score display to reflect any trick count changes
            this.updateScore();
            
        } catch (error) {
            console.error('Error displaying trick:', error);
        }
    }
    
    nextPlayer() {
        const players = ['south', 'west', 'north', 'east'];
        const currentIndex = players.indexOf(this.currentPlayer);
        this.currentPlayer = players[(currentIndex + 1) % 4];
        
        // Skip partner if playing alone
        if (this.playingAlone) {
            const alonePlayerPartner = this.getPartner(this.alonePlayer);
            if (this.currentPlayer === alonePlayerPartner) {
                this.currentPlayer = players[(players.indexOf(this.currentPlayer) + 1) % 4];
            }
        }
        
        // Update turn indicator
        this.updateTurnIndicator();
        
        if (this.players[this.currentPlayer].isAI) {
            setTimeout(() => this.aiPlay(), 1000);
        } else if (this.currentPlayer === 'south') {
            // Update card display to show playable/disabled states on human turn
            this.displayCards();
            this.showMessage("Your turn! Click a card to play.");
        }
        
        // Always update display when player changes (clears visual states when not human turn)
        if (this.currentPlayer !== 'south') {
            this.displayCards();
        }
    }
    
    aiPlay() {
        const player = this.currentPlayer;
        const cards = this.players[player].cards;
        
        if (cards.length === 0) return;
        
        // Skip if this is the partner of someone playing alone
        if (this.playingAlone) {
            const alonePlayerPartner = this.getPartner(this.alonePlayer);
            if (player === alonePlayerPartner) {
                this.nextPlayer();
                return;
            }
        }
        
        // Improved AI: follow suit if possible, otherwise play lowest card
        let cardIndex = 0;
        
        if (this.currentTrick.length > 0) {
            const leadSuit = this.getEffectiveSuit(this.currentTrick[0].card);
            const followCards = cards.filter(card => this.getEffectiveSuit(card) === leadSuit);
            
            if (followCards.length > 0) {
                // Must follow suit - play lowest following card
                const followCard = followCards[0];
                cardIndex = cards.indexOf(followCard);
            } else {
                // Cannot follow suit - play lowest card (or trump if advantageous)
                cardIndex = 0;
            }
        } else {
            // Leading - play a middle-value card
            cardIndex = Math.floor(cards.length / 2);
        }
        
        this.playCard(player, cardIndex);
    }
    
    /**
     * Get the effective suit of a card, considering bower rules
     * Left bower (Jack of same color as trump) becomes trump suit
     * @param {Object} card - Card object with rank and suit properties
     * @returns {string} Effective suit for following purposes
     */
    getEffectiveSuit(card) {
        if (!this.trump || !card) return card?.suit || '';
        
        // Right bower (Jack of trump suit) is trump
        if (card.rank === 'J' && card.suit === this.trump) {
            return this.trump;
        }
        
        // Left bower (Jack of same color as trump) becomes trump
        if (card.rank === 'J') {
            const sameColor = (this.trump === '♠' && card.suit === '♣') ||
                            (this.trump === '♣' && card.suit === '♠') ||
                            (this.trump === '♥' && card.suit === '♦') ||
                            (this.trump === '♦' && card.suit === '♥');
            if (sameColor) {
                return this.trump;
            }
        }
        
        return card.suit;
    }
    
    /**
     * Check if a player can follow the lead suit
     * @param {Array} hand - Player's cards
     * @param {string} leadSuit - The suit that was led
     * @returns {boolean} True if player has cards of the lead suit
     */
    canFollowSuit(hand, leadSuit) {
        return hand.some(card => this.getEffectiveSuit(card) === leadSuit);
    }
    
    /**
     * Check if a specific card is playable given the current trick state
     * @param {Object} card - The card to check
     * @param {string} player - The player trying to play the card
     * @returns {boolean} True if the card can be legally played
     */
    isCardPlayable(card, player) {
        // If it's not the player's turn, no cards are playable
        if (this.currentPlayer !== player) {
            return false;
        }
        
        // If no cards have been played in this trick, any card is playable
        if (this.currentTrick.length === 0) {
            return true;
        }
        
        // Get the lead suit
        const leadSuit = this.getEffectiveSuit(this.currentTrick[0].card);
        const playerHand = this.players[player].cards;
        
        // Check if player can follow suit
        const canFollow = this.canFollowSuit(playerHand, leadSuit);
        
        // If player can't follow suit, any card is playable
        if (!canFollow) {
            return true;
        }
        
        // If player can follow suit, only cards of the lead suit are playable
        const cardSuit = this.getEffectiveSuit(card);
        return cardSuit === leadSuit;
    }

    /**
     * Calculate the value of a card in Euchre with proper bower hierarchy
     * Right bower (Jack of trump) is highest, left bower (Jack of same color) is second
     * @param {Object} card - Card object with rank and suit properties
     * @param {string} trump - Current trump suit (♠, ♥, ♦, ♣)
     * @param {string|null} leadSuit - The suit led in current trick (null for evaluation)
     * @returns {number} Card value for comparison (higher = stronger)
     */
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
        try {
            if (!this.currentTrick || this.currentTrick.length === 0) return;
            
            // Ensure we have a valid first card
            if (!this.currentTrick[0]?.card?.suit) {
                console.error('Invalid first card in trick');
                return;
            }
            
            const leadSuit = this.currentTrick[0].card.suit;
            let winner = this.currentTrick[0];
            let highestValue = this.getCardValue(winner.card, this.trump, leadSuit);
            
            // Find the winning card in the trick
            for (let i = 1; i < this.currentTrick.length; i++) {
                if (!this.currentTrick[i]?.card) continue;
                
                const cardValue = this.getCardValue(this.currentTrick[i].card, this.trump, leadSuit);
                if (cardValue > highestValue) {
                    highestValue = cardValue;
                    winner = this.currentTrick[i];
                }
            }
            
            // Update tricks for the winning player
            if (winner?.player && this.players[winner.player]) {
                this.players[winner.player].tricks = (this.players[winner.player].tricks || 0) + 1;
                
                // Update the score display
                this.updateScore();
                
                // Show winner message
                const winnerName = this.playerSettings[winner.player]?.name || winner.player;
                this.showMessage(`${winnerName} wins the trick!`);
                
                
                // Clear trick and handle next turn
                setTimeout(() => this.processTrickCompletion(winner), 2000);
            } else {
                console.error('Could not determine trick winner');
                this.currentTrick = [];
            }
        } catch (error) {
            console.error('Error evaluating trick:', error);
            this.currentTrick = [];
            this.nextPlayer();
        }
    }
    
    processTrickCompletion(winner) {
        const centerArea = document.getElementById('center-area');
        if (centerArea) centerArea.innerHTML = '';
        
        this.currentTrick = [];
        
        // Check if hand is over
        if (this.players.south?.cards?.length === 0) {
            this.endHand();
            return;
        }
        
        // Set next player
        if (winner?.player) {
            this.currentPlayer = winner.player;
            
            // Skip partner if playing alone
            if (this.playingAlone) {
                const alonePlayerPartner = this.getPartner(this.alonePlayer);
                if (this.currentPlayer === alonePlayerPartner) {
                    const players = ['south', 'west', 'north', 'east'];
                    const currentIndex = players.indexOf(this.currentPlayer);
                    this.currentPlayer = players[(currentIndex + 1) % 4];
                }
            }
            
            // Handle AI or player turn
            if (this.players[this.currentPlayer]?.isAI) {
                setTimeout(() => this.aiPlay(), 500);
            } else {
                // Update display for human player's turn
                this.displayCards();
                this.showMessage("Your turn! Click a card to play.");
            }
        } else {
            // Fallback to next player if winner is not properly set
            this.nextPlayer();
        }
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
        
        // Refresh NPC profiles on new game
        this.initializeRandomNPCs();
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
        // Safely update score display if elements exist
        const team1ScoreEl = document.getElementById('team1-score');
        const team2ScoreEl = document.getElementById('team2-score');
        const roundEl = document.getElementById('round');
        const team1TricksEl = document.getElementById('team1-tricks');
        const team2TricksEl = document.getElementById('team2-tricks');
        
        if (team1ScoreEl) team1ScoreEl.textContent = this.team1Score;
        if (team2ScoreEl) team2ScoreEl.textContent = this.team2Score;
        if (roundEl) roundEl.textContent = this.round;
        
        // Update tricks display and progress bars
        if (team1TricksEl) {
            const team1Tricks = (this.players.south?.tricks || 0) + (this.players.north?.tricks || 0);
            const oldValue = parseInt(team1TricksEl.textContent);
            team1TricksEl.textContent = team1Tricks;
            
            // Update progress bar
            const team1Progress = document.getElementById('team1-progress');
            if (team1Progress) {
                const percentage = (team1Tricks / 5) * 100;
                team1Progress.style.width = `${percentage}%`;
            }
            
            // Add animation if tricks increased
            if (team1Tricks > oldValue) {
                const progressBar = document.querySelector('#team1-progress').closest('.progress-bar');
                if (progressBar) {
                    progressBar.classList.add('tricks-update');
                    setTimeout(() => {
                        progressBar.classList.remove('tricks-update');
                    }, 400);
                }
            }
        }
        if (team2TricksEl) {
            const team2Tricks = (this.players.east?.tricks || 0) + (this.players.west?.tricks || 0);
            const oldValue = parseInt(team2TricksEl.textContent);
            team2TricksEl.textContent = team2Tricks;
            
            // Update progress bar
            const team2Progress = document.getElementById('team2-progress');
            if (team2Progress) {
                const percentage = (team2Tricks / 5) * 100;
                team2Progress.style.width = `${percentage}%`;
            }
            
            // Add animation if tricks increased
            if (team2Tricks > oldValue) {
                const progressBar = document.querySelector('#team2-progress').closest('.progress-bar');
                if (progressBar) {
                    progressBar.classList.add('tricks-update');
                    setTimeout(() => {
                        progressBar.classList.remove('tricks-update');
                    }, 400);
                }
            }
        }
    }
    
    updateStats() {
        // Safely update stats if elements exist
        const handsPlayedEl = document.getElementById('hands-played');
        const gamesWonEl = document.getElementById('games-won');
        const winRateEl = document.getElementById('win-rate');
        
        if (handsPlayedEl) handsPlayedEl.textContent = this.stats.handsPlayed;
        if (gamesWonEl) gamesWonEl.textContent = this.stats.gamesWon;
        
        if (winRateEl) {
            const total = this.stats.gamesWon + this.stats.gamesLost;
            const winRate = total > 0 ? 
                Math.round((this.stats.gamesWon / total) * 100) : 0;
            winRateEl.textContent = `${winRate}%`;
        }
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
    
    displayKitty() {
        const kittyDisplay = document.getElementById('kitty-display');
        const kittyCards = document.getElementById('kitty-cards');
        const kittyCount = document.getElementById('kitty-count');
        
        if (!kittyDisplay || !kittyCards || !kittyCount) return;
        
        // Show kitty during trump selection phase
        if (this.trumpSelectionPhase && this.kitty.length > 0) {
            kittyDisplay.classList.add('active');
            
            // Clear previous cards
            kittyCards.innerHTML = '';
            
            // Show face-down cards
            for (let i = 0; i < this.kitty.length; i++) {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'kitty-card';
                kittyCards.appendChild(cardDiv);
            }
            
            kittyCount.textContent = this.kitty.length;
        } else {
            kittyDisplay.classList.remove('active');
        }
    }
    
    hideKitty() {
        document.getElementById('kitty-display').classList.remove('active');
    }
    
    /**
     * Convert string to title case
     * @param {string} str - String to convert
     * @returns {string} Title case string
     */
    toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
    
    /**
     * Get a random name and avatar pair for NPC players
     * @param {string} player - Player position (north, east, west)  
     * @returns {Object} Object with name and avatar properties
     */
    getRandomNPCProfile(player) {
        const profiles = {
            north: [
                { name: 'Alex Thunder', avatar: '⚡' },
                { name: 'Maya Starlight', avatar: '🌟' },
                { name: 'Robo Carl', avatar: '🤖' },
                { name: 'Drama Queen', avatar: '🎭' },
                { name: 'Lightning Lou', avatar: '⚡' },
                { name: 'Stellar Sue', avatar: '🌟' },
                { name: 'Tech Titan', avatar: '🤖' },
                { name: 'Mystic Mike', avatar: '🎭' }
            ],
            east: [
                { name: 'Bullseye Betty', avatar: '🎯' },
                { name: 'Fire Fox', avatar: '🔥' },
                { name: 'Diamond Dan', avatar: '💎' },
                { name: 'Sharp Shooter', avatar: '🎯' },
                { name: 'Blaze Master', avatar: '🔥' },
                { name: 'Gem Hunter', avatar: '💎' },
                { name: 'Ace Archer', avatar: '🎯' },
                { name: 'Flame Wizard', avatar: '🔥' }
            ],
            west: [
                { name: 'Rocket Rita', avatar: '🚀' },
                { name: 'Circus Sam', avatar: '🎪' },
                { name: 'Lucky Dice', avatar: '🎲' },
                { name: 'Space Cadet', avatar: '🚀' },
                { name: 'Ring Master', avatar: '🎪' },
                { name: 'Game Changer', avatar: '🎲' },
                { name: 'Cosmic Kate', avatar: '🚀' },
                { name: 'Carnival King', avatar: '🎪' }
            ]
        };
        
        const playerProfiles = profiles[player] || profiles.north;
        const randomProfile = playerProfiles[Math.floor(Math.random() * playerProfiles.length)];
        
        // Add position suffix to make names unique
        const positionNames = {
            north: '(Partner)',
            east: '',
            west: ''
        };
        
        return {
            name: player === 'north' ? `${randomProfile.name} ${positionNames[player]}` : randomProfile.name,
            avatar: randomProfile.avatar
        };
    }
    
    /**
     * Get a random avatar for NPC players (legacy support)
     * @param {string} player - Player position (north, east, west)
     * @returns {string} Random avatar emoji
     */
    getRandomAvatar(player) {
        return this.getRandomNPCProfile(player).avatar;
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
            cardElement.className = 'card dealer-card';
            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-corner top-left">
                        <div class="rank" style="color:${card.color}">${card.rank}</div>
                        <div class="suit" style="color:${card.color}">${card.suit}</div>
                    </div>
                    <div class="card-center" style="color:${card.color}">
                        ${card.suit}
                    </div>
                    <div class="card-corner bottom-right">
                        <div class="rank rotated" style="color:${card.color}">${card.rank}</div>
                        <div class="suit rotated" style="color:${card.color}">${card.suit}</div>
                    </div>
                </div>
            `;
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
    
    // Card back style is now fixed to classic blue
    
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
        // Save player settings and game options to localStorage
        try {
            const settings = {
                players: this.playerSettings,
                soundEnabled: this.soundEnabled
            };
            localStorage.setItem('euchre-player-settings', JSON.stringify(settings));
        } catch (e) {
            console.error('Error saving settings:', e);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('euchre-player-settings');
            if (saved) {
                const savedSettings = JSON.parse(saved);
                
                // Handle both old and new format
                if (savedSettings.players) {
                    // New format with sound settings
                    this.playerSettings = { ...this.playerSettings, ...savedSettings.players };
                    this.soundEnabled = savedSettings.soundEnabled ?? true;
                } else {
                    // Old format - just player settings
                    this.playerSettings = { ...this.playerSettings, ...savedSettings };
                }
                
                // Update sound button UI
                const soundBtn = document.getElementById('sound-toggle');
                if (soundBtn) {
                    soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
                }
                
                // Check if saved settings have default names and need randomization
                const playerData = savedSettings.players || savedSettings;
                const needsRandomization = 
                    playerData.north?.name === 'North (Partner)' ||
                    playerData.east?.name === 'East' ||
                    playerData.west?.name === 'West' ||
                    playerData.north?.name?.includes('North') ||
                    playerData.east?.name?.includes('East') ||
                    playerData.west?.name?.includes('West');
                    
                if (needsRandomization) {
                    console.log('🎲 Refreshing NPC profiles...');
                    this.initializeRandomNPCs();
                }
            } else {
                // First time - set random NPC profiles
                this.initializeRandomNPCs();
            }
        } catch (e) {
            console.error('Error loading settings:', e);
            // Fallback to random NPCs if loading fails
            this.initializeRandomNPCs();
        }
    }
    
    /**
     * Initialize random names and avatars for NPC players
     * Called on first game load or when settings can't be loaded
     * Assigns unique character profiles to north, east, and west players
     */
    initializeRandomNPCs() {
        console.log('🎲 Initializing random NPC profiles...');
        ['north', 'east', 'west'].forEach(player => {
            const profile = this.getRandomNPCProfile(player);
            this.playerSettings[player].name = profile.name;
            this.playerSettings[player].avatar = profile.avatar;
            console.log(`✨ ${player}: ${profile.name} ${profile.avatar}`);
        });
        // Save the random settings and update display
        this.saveSettings();
        // Update the UI display if DOM is ready
        if (typeof document !== 'undefined') {
            this.updatePlayerDisplay();
        }
    }
    
    setDealerChip() {
        // Remove existing dealer chips
        const existingChips = document.querySelectorAll('.dealer-chip');
        existingChips.forEach(chip => chip.remove());
        
        // Get the avatar element for the current dealer
        const dealerAvatar = document.getElementById(`${this.currentDealer}-avatar`);
        if (dealerAvatar) {
            const chip = document.createElement('div');
            chip.className = 'dealer-chip';
            chip.textContent = 'D';
            chip.title = 'Dealer';
            dealerAvatar.appendChild(chip);
        }
    }
    
    displayFlippedCard() {
        const flippedCardEl = document.getElementById('flipped-card');
        if (!flippedCardEl) return;
        
        if (this.flippedCard) {
            flippedCardEl.innerHTML = `
                <div class="card-content">
                    <div class="card-corner top-left">
                        <div class="rank" style="color:${this.flippedCard.color}">${this.flippedCard.rank}</div>
                        <div class="suit" style="color:${this.flippedCard.color}">${this.flippedCard.suit}</div>
                    </div>
                    <div class="card-center" style="color:${this.flippedCard.color}">
                        ${this.flippedCard.suit}
                    </div>
                    <div class="card-corner bottom-right">
                        <div class="rank rotated" style="color:${this.flippedCard.color}">${this.flippedCard.rank}</div>
                        <div class="suit rotated" style="color:${this.flippedCard.color}">${this.flippedCard.suit}</div>
                    </div>
                </div>
            `;
            flippedCardEl.style.display = 'flex';
        } else {
            flippedCardEl.style.display = 'none';
        }
        
        // Update trump display
        const trumpDisplay = document.getElementById('trump-display');
        if (trumpDisplay) {
            if (this.trump) {
                const color = (this.trump === '♥' || this.trump === '♦') ? '#e74c3c' : '#2c3e50';
                trumpDisplay.innerHTML = `Trump: <span style="color: ${color}">${this.trump}</span>`;
            } else {
                trumpDisplay.textContent = 'Trump: Not Set';
            }
        }
    }
    
    updatePlayerDisplay() {
        // Update player avatars and names
        ['south', 'north', 'east', 'west'].forEach(player => {
            const avatar = document.getElementById(`${player}-avatar`);
            const nameEl = document.querySelector(`.player-position.${this.getPositionClass(player)} .player-name`);
            
            if (avatar && this.playerSettings[player]) {
                avatar.textContent = this.playerSettings[player].avatar;
            }
            
            if (nameEl && this.playerSettings[player]) {
                nameEl.textContent = this.playerSettings[player].name;
            }
        });
        
        // Update score display with player names
        const team1Name = `${this.playerSettings.south.name} & ${this.playerSettings.north.name}`;
        const team2Name = `${this.playerSettings.east.name} & ${this.playerSettings.west.name}`;
        
        // Update team name displays in score panel
        const team1NameElements = document.querySelectorAll('.team-name');
        if (team1NameElements.length >= 2) {
            const team1El = team1NameElements[0];
            const team2El = team1NameElements[1];
            
            if (team1El) {
                const scoreSpan = team1El.querySelector('span');
                const scoreValue = scoreSpan ? scoreSpan.outerHTML : '';
                team1El.innerHTML = `${team1Name}: ${scoreValue}`;
            }
            if (team2El) {
                const scoreSpan = team2El.querySelector('span');
                const scoreValue = scoreSpan ? scoreSpan.outerHTML : '';
                team2El.innerHTML = `${team2Name}: ${scoreValue}`;
            }
        }
        
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
    
    /**
     * Get the partner of a given player
     * @param {string} player - The player position ('south', 'north', 'east', 'west')
     * @returns {string} The partner's position
     */
    getPartner(player) {
        const partners = {
            south: 'north',
            north: 'south',
            east: 'west',
            west: 'east'
        };
        return partners[player];
    }
    
    /**
     * Initialize audio context after user gesture to comply with browser autoplay policies
     * @method initAudioContext
     */
    initAudioContext() {
        if (!this.audioContext && this.soundEnabled) {
            try {
                this.audioContext = new (window.AudioContext || window['webkitAudioContext'])();
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            } catch (error) {
                console.log('🔇 Audio not supported');
            }
        }
    }

    /**
     * Play sound effect if sounds are enabled
     * @param {string} soundType - Type of sound to play
     */
    playSound(soundType) {
        if (!this.soundEnabled) return;
        
        // Initialize audio context if needed
        this.initAudioContext();
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Different sounds for different actions
            switch (soundType) {
                case 'cardPlay':
                    // Create a more realistic "card snap" sound
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.05);
                    oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.08);
                    gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.02, this.audioContext.currentTime + 0.05);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.08);
                    oscillator.type = 'square';
                    oscillator.start();
                    oscillator.stop(this.audioContext.currentTime + 0.08);
                    break;
                default:
                    return;
            }
        } catch (error) {
            console.log('🔇 Audio playback error:', error);
        }
    }
    
    /**
     * Toggle sound effects on/off and update UI
     * @method toggleSound
     */
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) {
            soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        }
        this.saveSettings();
    }


    
    getRandomDealer() {
        const players = ['south', 'west', 'north', 'east'];
        return players[Math.floor(Math.random() * players.length)];
    }
    
    showHelp() {
        document.getElementById('help-modal').classList.add('active');
    }
    
    hideHelp() {
        document.getElementById('help-modal').classList.remove('active');
    }
    
    editPlayerName(player) {
        const nameElement = document.querySelector(`.player-position.${this.getPositionClass(player)} .player-name`);
        if (!nameElement || nameElement.querySelector('input')) return;
        
        const currentName = this.playerSettings[player].name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'player-name-input';
        input.value = currentName;
        input.maxLength = 12;
        
        // Replace text with input
        nameElement.style.display = 'none';
        nameElement.parentNode.appendChild(input);
        input.focus();
        input.select();
        
        let isEditing = true;
        
        const saveEdit = () => {
            if (!isEditing) return;
            isEditing = false;
            
            const newName = this.toTitleCase(input.value.trim()) || currentName;
            this.playerSettings[player].name = newName;
            nameElement.textContent = newName;
            nameElement.style.display = 'block';
            
            if (input.parentNode) {
                input.remove();
            }
            
            this.updatePlayerDisplay();
            this.saveSettings();
        };
        
        const cancelEdit = () => {
            if (!isEditing) return;
            isEditing = false;
            
            nameElement.style.display = 'block';
            if (input.parentNode) {
                input.remove();
            }
        };
        
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
    
    showAvatarSelector(player) {
        // Hide all other selectors
        document.querySelectorAll('.avatar-selector').forEach(selector => {
            selector.classList.remove('active');
        });
        
        const selector = document.getElementById(`${player}-avatar-selector`);
        if (!selector) return;
        
        selector.classList.add('active');
        
        // Add click handlers for avatar options
        selector.querySelectorAll('.avatar-option').forEach(option => {
            option.onclick = (e) => {
                e.stopPropagation();
                const avatar = option.dataset.avatar;
                this.selectPlayerAvatar(player, avatar);
                selector.classList.remove('active');
            };
        });
        
        // Close selector when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!selector.contains(e.target)) {
                    selector.classList.remove('active');
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }
    
    selectPlayerAvatar(player, avatar) {
        this.playerSettings[player].avatar = avatar;
        document.getElementById(`${player}-avatar`).textContent = avatar;
        this.updatePlayerDisplay();
        this.saveSettings();
    }
    
    showNewGameConfirm() {
        document.getElementById('new-game-modal').classList.add('active');
    }
    
    hideNewGameConfirm() {
        document.getElementById('new-game-modal').classList.remove('active');
    }
    
    confirmNewGame() {
        this.hideNewGameConfirm();
        this.newGame();
    }
    
    /**
     * Rotate dealer chip to next player
     */
    rotateDealerChip() {
        // Remove dealer chip from current dealer
        document.querySelectorAll('.dealer-chip').forEach(chip => chip.remove());
        
        // Rotate to next dealer
        const dealers = ['south', 'west', 'north', 'east'];
        const currentIndex = dealers.indexOf(this.currentDealer);
        this.currentDealer = dealers[(currentIndex + 1) % 4];
        
        // Add dealer chip to new dealer
        const newDealerAvatar = document.getElementById(`${this.currentDealer}-avatar`);
        if (newDealerAvatar) {
            const chip = document.createElement('div');
            chip.className = 'dealer-chip';
            chip.textContent = 'D';
            newDealerAvatar.appendChild(chip);
        }
        
        console.log(`🎰 New dealer: ${this.playerSettings[this.currentDealer]?.name || this.currentDealer}`);
    }
    
    /**
     * Update turn indicator to show whose turn it is with name glow effect
     * @method updateTurnIndicator
     */
    updateTurnIndicator() {
        // Remove glow from all player names first
        const allPlayers = ['north', 'east', 'south', 'west'];
        allPlayers.forEach(player => {
            const nameElement = document.getElementById(`${player}-name`);
            if (nameElement) {
                nameElement.classList.remove('active-turn');
                nameElement.setAttribute('aria-current', 'false');
            }
        });
        
        // Add glow to current player's name during card play phase
        if (this.gamePhase === 'play' && this.currentPlayer) {
            const currentNameElement = document.getElementById(`${this.currentPlayer}-name`);
            
            if (currentNameElement) {
                currentNameElement.classList.add('active-turn');
                currentNameElement.setAttribute('aria-current', 'true');
                
                const playerName = this.playerSettings[this.currentPlayer]?.name || this.currentPlayer;
                console.log(`🎯 Turn indicator: ${playerName} (${this.currentPlayer})`);
            }
        }
    }
}

// Initialize game
window.game = new EuchreGame();