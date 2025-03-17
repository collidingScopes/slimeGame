// Main game logic and initialization

// Game state variables
let grid = [];              // Current state of the world
let originalGrid = [];      // Original state of the world (without mold)
let moldSpots = [];         // Array of active mold spots
let defeatedCount = 0;      // Number of mold spots defeated
let difficulty = 1;         // Current difficulty level
let gameOver = false;       // Game over state
let lastMoldTime = 0;       // Time of last mold spawn
let lastMoldGrowth = 0;     // Time of last mold growth
let lastRenderTime = 0;     // For frame rate control
const TARGET_FPS = 30;      // Target frames per second
const FRAME_TIME = 1000 / TARGET_FPS;
let peerManager = null;     // Peer connection manager
let isHost = false;         // Whether this client is the host

// Mold spawn and growth rates
let moldSpawnRate = INITIAL_MOLD_SPAWN_RATE;
let moldGrowthRate = INITIAL_MOLD_GROWTH_RATE;

// Initialize the canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Mold indicators
const topIndicator = document.getElementById('topMoldIndicator');
const bottomIndicator = document.getElementById('bottomMoldIndicator');

// Visible area tracking
let visibleAreaTop = 0;
const visibleAreaHeight = window.innerHeight - 200; // Approximate visible height

// Scoreboard elements
const defeatedEl = document.getElementById('defeated');
const activeEl = document.getElementById('active');
const difficultyEl = document.getElementById('difficulty');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// Initialize game
async function initGame() {
    // Create initial grid (the host will share this later)
    createGrid();
    
    // Set up event listeners
    canvas.addEventListener('click', handleCanvasClick);
    restartBtn.addEventListener('click', restartGame);
    window.addEventListener('scroll', updateVisibleArea);
    window.addEventListener('resize', updateVisibleArea);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initialize pattern cache for faster rendering
    initPatternCache();
    
    // Initialize peer-to-peer connection manager
    peerManager = new PeerConnectionManager();
    
    // Set up callbacks
    peerManager.onPlayerJoin = handlePlayerJoin;
    peerManager.onPlayerLeave = handlePlayerLeave;
    peerManager.onGameStateUpdate = handleGameStateUpdate;
    peerManager.onBecomeHost = handleBecomeHost;
    
    // Initialize peer connection
    await peerManager.init();
    
    // Initialize timers
    lastMoldTime = Date.now();
    lastMoldGrowth = Date.now();
    lastRenderTime = Date.now();
    
    // Initial update of visible area
    updateVisibleArea();
    
    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Handle visibility change to pause processing when tab is inactive
function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is hidden, no need to update times
    } else {
        // Tab is visible again, reset timers to prevent sudden mold growth after inactivity
        if (isHost) {
            lastMoldTime = Date.now();
            lastMoldGrowth = Date.now();
        }
        lastRenderTime = Date.now();
        updateVisibleArea();
    }
}

// Handle becoming the host
function handleBecomeHost() {
    console.log('Now serving as the host');
    isHost = true;
    
    // Reset timers
    lastMoldTime = Date.now();
    lastMoldGrowth = Date.now();
    
    // Update difficulty based on player count
    updateDifficulty();
    
    // Broadcast initial game state to all peers
    broadcastGameState();
}

// Handle new player joining
function handlePlayerJoin(peerId) {
    console.log('New player joined:', peerId);
    
    // If we're the host, send the current game state to the new player
    if (isHost) {
        // Send full game state to the new player
        const gameState = {
            grid: grid,
            originalGrid: originalGrid,
            moldSpots: moldSpots,
            defeatedCount: defeatedCount,
            difficulty: difficulty,
            gameOver: gameOver
        };
        
        peerManager.send(peerId, {
            type: 'gameState',
            data: gameState
        });
        
        // Update difficulty based on new player count
        updateDifficulty();
    }
}

// Handle player leaving
function handlePlayerLeave(peerId) {
    console.log('Player left:', peerId);
    
    // If we're the host, update difficulty based on player count
    if (isHost) {
        updateDifficulty();
    }
}

// Handle game state update from another peer
function handleGameStateUpdate(data) {
    // Update our local game state based on host's state
    if (data.type === 'removeMold') {
        // Handle mold removal request (host only)
        if (isHost) {
            removeMold(data.x, data.y, data.playerId);
        }
    } else {
        // Full game state update
        grid = data.grid || grid;
        originalGrid = data.originalGrid || originalGrid;
        moldSpots = data.moldSpots || moldSpots;
        defeatedCount = data.defeatedCount || defeatedCount;
        difficulty = data.difficulty || difficulty;
        gameOver = data.gameOver || gameOver;
        
        // Update UI
        updateScoreboard();
        
        // Check if game is over
        if (gameOver) {
            showGameOver();
        }
    }
}

// Update the visible area based on scroll position
function updateVisibleArea() {
    const rect = canvas.getBoundingClientRect();
    visibleAreaTop = rect.top < 0 ? Math.abs(rect.top) : 0;
    
    // Update mold indicators
    updateMoldIndicators();
}

// Update mold indicators to show if there is mold above or below current view
function updateMoldIndicators() {
    // Get current scroll position and window height
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const canvasRect = canvas.getBoundingClientRect();
    
    // Calculate visible range in game coordinates
    const visibleTop = Math.max(0, scrollTop - canvas.offsetTop);
    const visibleBottom = visibleTop + windowHeight;
    
    let moldAbove = false;
    let moldBelow = false;
    
    // Check for mold above and below current view
    for (const spot of moldSpots) {
        const spotY = spot.y * CELL_SIZE + canvas.offsetTop;
        
        if (spotY < visibleTop) {
            moldAbove = true;
        }
        
        if (spotY > visibleBottom) {
            moldBelow = true;
        }
        
        // If we've already found mold in both directions, no need to check further
        if (moldAbove && moldBelow) break;
    }
    
    // Update indicator visibility
    topIndicator.style.display = moldAbove ? 'block' : 'none';
    bottomIndicator.style.display = moldBelow ? 'block' : 'none';
}

// Handle canvas click
function handleCanvasClick(event) {
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    const cellX = Math.floor(clickX / CELL_SIZE);
    const cellY = Math.floor(clickY / CELL_SIZE);
    
    if (isHost) {
        // If we're the host, handle the mold removal locally
        removeMold(cellX, cellY, peerManager.peerId);
    } else {
        // Otherwise, send the mold removal request to the host
        peerManager.send(peerManager.hostId, {
            type: 'removeMold',
            x: cellX,
            y: cellY,
            playerId: peerManager.peerId
        });
        
        // Show a visual effect locally for immediate feedback
        createSimpleCleansingEffect(cellX, cellY);
    }
}

// Update difficulty based on player count
function updateDifficulty() {
    const playerCount = peerManager.updatePlayerCount();
    
    // Calculate difficulty based on player count
    difficulty = Math.max(1, Math.floor(1 + (playerCount - 1) * 0.5));
    
    // Adjust mold spawn and growth rates based on difficulty
    moldSpawnRate = Math.max(1000, INITIAL_MOLD_SPAWN_RATE - (500 * (playerCount - 1)));
    moldGrowthRate = Math.max(1000, INITIAL_MOLD_GROWTH_RATE - (500 * (playerCount - 1)));
    
    // Update UI
    difficultyEl.textContent = difficulty;
    
    console.log(`Difficulty updated to ${difficulty} based on ${playerCount} players`);
}

// Update scoreboard
function updateScoreboard() {
    defeatedEl.textContent = defeatedCount;
    activeEl.textContent = moldSpots.length;
    difficultyEl.textContent = difficulty;
    
    // Update mold indicators
    updateMoldIndicators();
}

// Show game over
function showGameOver() {
    gameOverEl.style.display = 'block';
    finalScoreEl.textContent = defeatedCount;
}

// Restart game
function restartGame() {
    // Simply refresh the page to restart
    window.location.reload();
}

// Broadcast game state to all peers (host only)
function broadcastGameState() {
    if (!isHost || !peerManager) return;
    
    // Create a simplified game state to minimize network traffic
    const gameState = {
        grid: grid,
        moldSpots: moldSpots,
        defeatedCount: defeatedCount,
        difficulty: difficulty,
        gameOver: gameOver
    };
    
    // Broadcast to all peers
    peerManager.broadcast({
        type: 'gameState',
        data: gameState
    });
}

// Spawn a new mold spot (host only)
function spawnMold() {
    if (gameOver || !isHost) return;
    
    // Find a spot without mold
    let attempts = 0;
    let x, y;
    
    while (attempts < 100) {
        x = Math.floor(Math.random() * GRID_WIDTH);
        y = Math.floor(Math.random() * GRID_HEIGHT);
        
        if (grid[y][x] !== TERRAIN.MOLD) {
            grid[y][x] = TERRAIN.MOLD;
            moldSpots.push({x, y, size: 1, growthRate: 1});
            break;
        }
        
        attempts++;
    }
    
    // Update scoreboard
    updateScoreboard();
    
    // Broadcast updated game state
    broadcastGameState();
    
    // Update mold indicators since a new mold spot was added
    updateMoldIndicators();
}

// Grow existing mold spots (host only)
function growMold() {
    if (gameOver || !isHost) return;
    
    // Use a more efficient growth approach for larger maps
    // Only process mold that's active (not too many iterations)
    const maxMoldsToProcess = 100; // Limit batch size for performance
    const moldsToProcess = Math.min(moldSpots.length, maxMoldsToProcess);
    
    // Process a batch of mold spots based on random selection
    for (let i = 0; i < moldsToProcess; i++) {
        // Select a random mold spot to process
        const randomIndex = Math.floor(Math.random() * moldSpots.length);
        const spot = moldSpots[randomIndex];
        
        if (!spot) continue;
        
        // Calculate growth factor based on spot size
        const growthFactor = Math.min(3, Math.ceil(spot.size / 8)); // Capped growth factor
        
        // Try to grow in random directions
        for (let g = 0; g < growthFactor; g++) {
            if (Math.random() < 0.3 * difficulty) {
                // Get potential growth directions (only compute 4 directions for performance)
                const directions = getNeighbors(spot.x, spot.y);
                const randomDir = directions[Math.floor(Math.random() * directions.length)];
                
                if (randomDir && grid[randomDir.y][randomDir.x] !== TERRAIN.MOLD) {
                    grid[randomDir.y][randomDir.x] = TERRAIN.MOLD;
                    moldSpots.push({
                        x: randomDir.x, 
                        y: randomDir.y, 
                        size: 1,
                        growthRate: spot.growthRate * 1.1
                    });
                    spot.size++;
                }
            }
        }
    }
    
    // Update scoreboard (only after batch processing)
    updateScoreboard();
    
    // Check for game over - optimize to do this less frequently
    if (moldSpots.length > 0 && moldSpots.length % 50 === 0) {
        checkGameOver();
    }
    
    // Broadcast updated game state
    broadcastGameState();
    
    // Update mold indicators after growth
    updateMoldIndicators();
}

// Handle mold removal when clicked
function removeMold(x, y, playerId) {
    if (!isHost) return;
    
    if (grid[y][x] === TERRAIN.MOLD) {
        grid[y][x] = originalGrid[y][x];
        
        // Remove from mold spots - find index first for performance
        let spotIndex = -1;
        for (let i = 0; i < moldSpots.length; i++) {
            if (moldSpots[i] && moldSpots[i].x === x && moldSpots[i].y === y) {
                spotIndex = i;
                break;
            }
        }
        
        // Only splice if found (more efficient)
        if (spotIndex >= 0) {
            moldSpots.splice(spotIndex, 1);
        }
        
        // Update score
        defeatedCount++;
        
        // Update scoreboard
        updateScoreboard();
        
        // Broadcast updated game state
        broadcastGameState();
        
        // Create cleansing effect
        createSimpleCleansingEffect(x, y);
        
        // Update mold indicators after removing mold
        updateMoldIndicators();
        
        return true;
    }
    
    return false;
}

// Check for game over (host only)
function checkGameOver() {
    if (!isHost) return;
    
    // Use sampling to estimate mold coverage for better performance
    const totalCells = GRID_WIDTH * GRID_HEIGHT;
    
    // If we have a ton of mold spots, highly likely the game is over
    if (moldSpots.length >= totalCells * 0.9) {
        gameOver = true;
        broadcastGameState();
        showGameOver();
        return;
    }
    
    // Do a full check if mold spots are approaching total cells
    if (moldSpots.length >= totalCells * 0.7) {
        // Count non-mold cells with sampling (performance optimization)
        let nonMoldCells = 0;
        const samplesToCheck = 100; // Check a subset of cells
        
        for (let i = 0; i < samplesToCheck; i++) {
            const randomX = Math.floor(Math.random() * GRID_WIDTH);
            const randomY = Math.floor(Math.random() * GRID_HEIGHT);
            
            if (grid[randomY][randomX] !== TERRAIN.MOLD) {
                nonMoldCells++;
            }
        }
        
        // Estimate total non-mold cells based on sampling
        const estimatedNonMoldPercentage = nonMoldCells / samplesToCheck;
        
        if (estimatedNonMoldPercentage < 0.05) { // Less than 5% non-mold cells
            gameOver = true;
            broadcastGameState();
            showGameOver();
        }
    }
}

// Create simplified cleansing effect for better performance
function createSimpleCleansingEffect(x, y) {
    const centerX = x * CELL_SIZE + CELL_SIZE / 2;
    const centerY = y * CELL_SIZE + CELL_SIZE / 2;
    
    // Draw a single flash instead of an animation
    ctx.beginPath();
    ctx.arc(centerX, centerY, CELL_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    // Restore cell after a brief flash
    setTimeout(() => {
        // Only redraw the affected cell
        const terrainType = grid[y][x];
        
        // Draw base color
        ctx.fillStyle = TERRAIN_COLORS[terrainType];
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Draw pattern
        drawTerrainPattern(x, y, terrainType);
        
        // Draw grid line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }, 100);
}

// Game loop
function gameLoop() {
    const currentTime = Date.now();
    
    // Skip processing if the game tab is inactive
    if (document.hidden) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Limit frame rate for better performance
    if (currentTime - lastRenderTime < FRAME_TIME) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    lastRenderTime = currentTime;
    
    // Host-only logic
    if (isHost) {
        // Spawn new mold at intervals
        if (currentTime - lastMoldTime > moldSpawnRate) {
            spawnMold();
            lastMoldTime = currentTime;
        }
        
        // Grow existing mold at intervals
        if (currentTime - lastMoldGrowth > moldGrowthRate) {
            growMold();
            lastMoldGrowth = currentTime;
        }
    }
    
    // Draw the visible part of the grid
    drawGrid();
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.onload = initGame;