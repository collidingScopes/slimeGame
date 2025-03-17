// Main game logic and initialization

// Game state variables
let grid = [];              // Current state of the world
let originalGrid = [];      // Original state of the world (without mold)
let moldSpots = [];         // Array of active mold spots
let defeatedCount = 0;      // Number of mold spots defeated
let difficulty = 1;         // Current difficulty level
let gameOver = false;       // Game over state
let lastMoldTime = 0;       // Time of last mold spawn
let moldSpawnRate = INITIAL_MOLD_SPAWN_RATE;  // Time between mold spawns
let moldGrowthRate = INITIAL_MOLD_GROWTH_RATE;  // Time between mold growth
let lastMoldGrowth = 0;     // Time of last mold growth
let lastRenderTime = 0;     // For frame rate control
const TARGET_FPS = 30;      // Target frames per second
const FRAME_TIME = 1000 / TARGET_FPS;

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
function initGame() {
    // Create initial grid
    createGrid();
    
    // Set up event listeners
    canvas.addEventListener('click', handleCanvasClick);
    restartBtn.addEventListener('click', restartGame);
    window.addEventListener('scroll', updateVisibleArea);
    window.addEventListener('resize', updateVisibleArea);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initialize pattern cache for faster rendering
    initPatternCache();
    
    // Initialize timers
    lastMoldTime = Date.now();
    lastMoldGrowth = Date.now();
    lastRenderTime = Date.now();
    
    // Initial update of visible area
    updateVisibleArea();
    
    // Start game loop
    gameLoop();
}

// Handle visibility change to pause processing when tab is inactive
function handleVisibilityChange() {
    if (document.hidden) {
        // Tab is hidden, no need to update times
    } else {
        // Tab is visible again, reset timers to prevent sudden mold growth after inactivity
        lastMoldTime = Date.now();
        lastMoldGrowth = Date.now();
        lastRenderTime = Date.now();
        updateVisibleArea();
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
    
    // Try to remove mold at the clicked location
    removeMold(cellX, cellY);
}

// Update scoreboard
function updateScoreboard() {
    defeatedEl.textContent = defeatedCount;
    activeEl.textContent = moldSpots.length;
    
    // Update mold indicators
    updateMoldIndicators();
}

// End game
function endGame() {
    gameOver = true;
    gameOverEl.style.display = 'block';
    finalScoreEl.textContent = defeatedCount;
}

// Restart game
function restartGame() {
    gameOver = false;
    gameOverEl.style.display = 'none';
    defeatedCount = 0;
    difficulty = 1;
    moldSpawnRate = INITIAL_MOLD_SPAWN_RATE;
    moldGrowthRate = INITIAL_MOLD_GROWTH_RATE;
    lastMoldTime = Date.now();
    lastMoldGrowth = Date.now();
    
    // Reset the grid
    createGrid();
    updateScoreboard();
    difficultyEl.textContent = difficulty;
}

// Game loop
function gameLoop() {
    const currentTime = Date.now();
    
    // Skip rendering if the game tab is inactive
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
    
    // Draw the visible part of the grid
    drawGrid();
    
    // Continue the game loop with optimized animation frame
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.onload = initGame;