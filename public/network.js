// Handles network communication for the multiplayer game

// Connection variables
let socket;
let playerId;
let isConnected = false;
let reconnectAttempts = 0;
let playersEl;

// Connection status elements
let statusEl;
let statusTextEl;

// Get the WebSocket server URL
function getServerUrl() {
    // For local development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `ws://${window.location.hostname}:3000`;
    }
    
    // For Netlify deployment - using the Edge Function WebSocket endpoint
    // This works with Netlify's Edge Functions
    return `wss://${window.location.host}/ws`;
}

// Initialize network connection
function initNetwork() {
    // Add player count element to the scoreboard
    const scoreboardEl = document.getElementById('scoreboard');
    
    if (!document.getElementById('players')) {
        const playerCountDiv = document.createElement('div');
        playerCountDiv.className = 'score-item';
        playerCountDiv.innerHTML = `
            <span>Players</span>
            <span id="players" class="score-value players">1</span>
        `;
        scoreboardEl.appendChild(playerCountDiv);
        
        playersEl = document.getElementById('players');
    }
    
    // Initialize connection status elements
    statusEl = document.getElementById('connection-status');
    statusTextEl = document.getElementById('status-text');
    
    // Add host badge if needed (will be shown later when host status is determined)
    if (!document.getElementById('host-badge')) {
        const hostBadge = document.createElement('span');
        hostBadge.id = 'host-badge';
        hostBadge.className = 'host-badge';
        hostBadge.textContent = 'HOST';
        hostBadge.style.display = 'none';
        scoreboardEl.querySelector('.score-item:nth-child(2)').appendChild(hostBadge);
    }
    
    // Update connection status UI
    updateConnectionStatus('connecting', 'Connecting...');
    
    // Connect to WebSocket server
    connectToServer();
    
    // Setup reconnection handling
    window.addEventListener('online', () => {
        if (!isConnected) {
            updateConnectionStatus('connecting', 'Reconnecting...');
            connectToServer();
        }
    });
    
    window.addEventListener('offline', () => {
        updateConnectionStatus('disconnected', 'Connection lost');
    });
}

// Update connection status UI
function updateConnectionStatus(status, message) {
    if (statusEl) {
        statusEl.className = status;
        statusTextEl.textContent = message;
    }
    
    // Show host badge if this client is the host
    if (status === 'connected' && isHost) {
        const hostBadge = document.getElementById('host-badge');
        if (hostBadge) {
            hostBadge.style.display = 'inline-block';
        }
    }
    
    // Show a temporary message for important status changes
    if (status === 'connected' || status === 'disconnected') {
        showNetworkMessage(message, 3000);
    }
}

// Show a temporary network message
function showNetworkMessage(message, duration) {
    // Remove any existing messages
    const existingMsg = document.querySelector('.network-message');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    // Create and show the new message
    const msgEl = document.createElement('div');
    msgEl.className = 'network-message';
    msgEl.textContent = message;
    document.body.appendChild(msgEl);
    
    // Trigger animation
    setTimeout(() => {
        msgEl.classList.add('show');
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        msgEl.classList.remove('show');
        setTimeout(() => msgEl.remove(), 300);
    }, duration);
}

// Connect to the WebSocket server
function connectToServer() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return; // Already connected or connecting
    }
    
    try {
        socket = new WebSocket(getServerUrl());
        
        socket.onopen = handleSocketOpen;
        socket.onmessage = handleSocketMessage;
        socket.onclose = handleSocketClose;
        socket.onerror = handleSocketError;
        
        console.log('Attempting connection to WebSocket server...');
    } catch (error) {
        console.error('Failed to connect to WebSocket server:', error);
        scheduleReconnect();
    }
}

// Handle WebSocket connection open
function handleSocketOpen() {
    console.log('Connected to WebSocket server');
    isConnected = true;
    reconnectAttempts = 0;
    
    // Update connection status
    updateConnectionStatus('connected', 'Connected');
    
    // Keep connection alive with periodic pings
    startPingInterval();
}

// Handle WebSocket messages
function handleSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'init':
                // Initial connection successful
                playerId = data.playerId;
                
                // Apply initial game state
                if (data.gameState) {
                    applyGameState(data.gameState);
                }
                
                console.log('Initialized with player ID:', playerId);
                break;
                
            case 'gameState':
                // Update game state from server
                applyGameState(data);
                break;
                
            case 'pong':
                // Server response to ping - connection is alive
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    } catch (error) {
        console.error('Error parsing message:', error);
    }
}

// Apply game state from server
function applyGameState(state) {
    // Update player count with animation if it changed
    if (playersEl && state.playerCount !== undefined) {
        if (playersEl.textContent != state.playerCount) {
            // Add highlight effect
            playersEl.classList.add('highlight');
            
            // Remove highlight after animation
            setTimeout(() => {
                playersEl.classList.remove('highlight');
            }, 500);
            
            // Show message about player joining/leaving
            const prevCount = parseInt(playersEl.textContent) || 1;
            if (state.playerCount > prevCount) {
                showNetworkMessage(`A new player has joined!`, 2000);
            } else if (state.playerCount < prevCount) {
                showNetworkMessage(`A player has left`, 2000);
            }
        }
        
        playersEl.textContent = state.playerCount;
    }
    
    // Update difficulty based on player count
    if (state.difficulty !== undefined && difficulty !== state.difficulty) {
        // Add highlight effect to difficulty
        difficultyEl.classList.add('highlight');
        
        // Remove highlight after animation
        setTimeout(() => {
            difficultyEl.classList.remove('highlight');
        }, 500);
        
        difficulty = state.difficulty;
        difficultyEl.textContent = Math.round(difficulty * 10) / 10; // Round to 1 decimal place

        // Adjust mold spawn and growth rates based on difficulty
        moldSpawnRate = Math.max(1000, INITIAL_MOLD_SPAWN_RATE - (difficulty - 1) * 500);
        moldGrowthRate = Math.max(1000, INITIAL_MOLD_GROWTH_RATE - (difficulty - 1) * 500);
        
        if (state.playerCount > 1) {
            showNetworkMessage(`Difficulty adjusted to ${Math.round(difficulty * 10) / 10}`, 2000);
        }
    }
    
    // Apply mold spots from server if it's a significant update
    if (state.moldSpots && 
        (moldSpots.length === 0 || 
         Math.abs(moldSpots.length - state.moldSpots.length) > 1 || 
         state.moldSpots.length < moldSpots.length)) {
        
        // If mold spots decreased significantly, it means someone cleared mold
        if (moldSpots.length > 0 && state.moldSpots.length < moldSpots.length) {
            // Find removed spots
            const currentSpots = new Set(moldSpots.map(spot => `${spot.x},${spot.y}`));
            const newSpots = new Set(state.moldSpots.map(spot => `${spot.x},${spot.y}`));
            
            // Show cleansing effects for removed spots
            for (const spot of moldSpots) {
                const key = `${spot.x},${spot.y}`;
                if (!newSpots.has(key)) {
                    // Show cleansing effect for this spot that was removed by another player
                    showRemoteCleansingEffect(spot.x, spot.y);
                }
            }
        }
        
        // Update mold spots
        moldSpots = state.moldSpots.map(spot => ({...spot}));
        updateScoreboard();
    }
    
    // Update defeated count
    if (state.defeatedCount !== undefined && defeatedCount !== state.defeatedCount) {
        // Add highlight effect
        defeatedEl.classList.add('highlight');
        
        // Remove highlight after animation
        setTimeout(() => {
            defeatedEl.classList.remove('highlight');
        }, 500);
        
        defeatedCount = state.defeatedCount;
        updateScoreboard();
    }
    
    // Initialize terrain with seed if provided
    if (state.seed !== undefined && !grid.length) {
        // Use the seed to generate consistent terrain across all clients
        Math.seedrandom(state.seed.toString());
        createGrid();
    }
    
    // Handle any player actions
    if (state.playerAction) {
        showPlayerAction(state.playerAction);
    }
}

// Show cleansing effect for a remote player's action
function showRemoteCleansingEffect(x, y) {
    // Calculate screen position
    const posX = x * CELL_SIZE + CELL_SIZE / 2;
    const posY = y * CELL_SIZE + CELL_SIZE / 2;
    
    // Create animation element
    const effectEl = document.createElement('div');
    effectEl.className = 'cleanse-animation';
    effectEl.style.left = `${posX - CELL_SIZE}px`;
    effectEl.style.top = `${posY - CELL_SIZE}px`;
    effectEl.style.width = `${CELL_SIZE * 2}px`;
    effectEl.style.height = `${CELL_SIZE * 2}px`;
    
    // Add to DOM
    document.getElementById('game-container').appendChild(effectEl);
    
    // Remove after animation completes
    setTimeout(() => {
        effectEl.remove();
    }, 600);
}

// Show player action indicator
function showPlayerAction(action) {
    if (!action || !action.type) return;
    
    let message = '';
    let position = { x: 0, y: 0 };
    
    switch (action.type) {
        case 'removeMold':
            message = `${action.player} cleared mold!`;
            position.x = action.x * CELL_SIZE;
            position.y = action.y * CELL_SIZE;
            break;
            
        default:
            return;
    }
    
    // Create action indicator
    const actionEl = document.createElement('div');
    actionEl.className = 'player-action';
    actionEl.textContent = message;
    actionEl.style.left = `${position.x}px`;
    actionEl.style.top = `${position.y}px`;
    
    // Add to DOM
    document.getElementById('game-container').appendChild(actionEl);
    
    // Remove after animation completes
    setTimeout(() => {
        actionEl.remove();
    }, 1000);
}

// Handle WebSocket connection close
function handleSocketClose(event) {
    console.log('Disconnected from WebSocket server:', event.code, event.reason);
    isConnected = false;
    
    // Update connection status
    updateConnectionStatus('disconnected', 'Disconnected');
    
    // Clear ping interval
    clearPingInterval();
    
    // Schedule reconnection attempt
    scheduleReconnect();
}

// Handle WebSocket errors
function handleSocketError(error) {
    console.error('WebSocket error:', error);
    socket.close();
}

// Schedule reconnection attempt
function scheduleReconnect() {
    // Exponential backoff for reconnection attempts
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(maxDelay, baseDelay * Math.pow(1.5, reconnectAttempts));
    
    console.log(`Reconnecting in ${delay / 1000} seconds...`);
    
    // Update status with countdown
    const seconds = Math.ceil(delay / 1000);
    updateConnectionStatus('connecting', `Reconnecting in ${seconds}s...`);
    
    setTimeout(() => {
        reconnectAttempts++;
        updateConnectionStatus('connecting', 'Connecting...');
        connectToServer();
    }, delay);
}

// Keep connection alive with periodic pings
let pingInterval;

function startPingInterval() {
    pingInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
        }
    }, 30000); // Send ping every 30 seconds
}

function clearPingInterval() {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }
}

// Send mold removal to server
function sendMoldRemoval(x, y) {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'removeMold',
            x: x,
            y: y
        }));
    }
}

// Send new mold spot to server
function sendNewMold(x, y, size, growthRate) {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'addMold',
            x: x,
            y: y,
            size: size || 1,
            growthRate: growthRate || 1
        }));
    }
}

// Send mold growth to server
function sendMoldGrowth() {
    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'growMold',
            moldSpots: moldSpots
        }));
    }
}