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

// Initialize minimap elements
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const minimapWidth = 150;
const minimapHeight = Math.floor(minimapWidth * (GRID_HEIGHT / GRID_WIDTH));
minimapCanvas.width = minimapWidth;
minimapCanvas.height = minimapHeight;

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
    minimapCanvas.addEventListener('click', handleMinimapClick);
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
    
    // Update minimap
    drawMinimap();
}

// Handle minimap click to navigate to different areas
function handleMinimapClick(event) {
    const rect = minimapCanvas.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    
    // Calculate the corresponding position in the main canvas
    const targetY = (clickY / minimapHeight) * CANVAS_HEIGHT;
    
    // Scroll to that position
    window.scrollTo({
        top: canvas.offsetTop + targetY - window.innerHeight / 2,
        behavior: 'smooth'
    });
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
    
    // Update minimap
    drawMinimap();
}

// Draw the minimap with optimization
function drawMinimap() {
    // Clear minimap
    minimapCtx.clearRect(0, 0, minimapWidth, minimapHeight);
    
    // Scale factors
    const scaleX = minimapWidth / GRID_WIDTH;
    const scaleY = minimapHeight / GRID_HEIGHT;
    
    // Draw terrain representation with optimization (draw in larger blocks)
    const blockSize = 2; // Combine cells for faster drawing
    
    for (let y = 0; y < GRID_HEIGHT; y += blockSize) {
        for (let x = 0; x < GRID_WIDTH; x += blockSize) {
            // Determine dominant terrain in this block
            let terrainCounts = new Array(TERRAIN_COLORS.length).fill(0);
            
            // Count terrain types in this block
            for (let by = 0; by < blockSize && y + by < GRID_HEIGHT; by++) {
                for (let bx = 0; bx < blockSize && x + bx < GRID_WIDTH; bx++) {
                    terrainCounts[grid[y + by][x + bx]]++;
                }
            }
            
            // Find most common terrain type
            let dominantTerrain = 0;
            let maxCount = 0;
            
            for (let t = 0; t < terrainCounts.length; t++) {
                if (terrainCounts[t] > maxCount) {
                    maxCount = terrainCounts[t];
                    dominantTerrain = t;
                }
            }
            
            // Prioritize mold in visualization
            if (terrainCounts[TERRAIN.MOLD] > 0) {
                dominantTerrain = TERRAIN.MOLD;
            }
            
            // Draw the block
            minimapCtx.fillStyle = TERRAIN_COLORS[dominantTerrain];
            minimapCtx.fillRect(
                x * scaleX,
                y * scaleY,
                blockSize * scaleX,
                blockSize * scaleY
            );
        }
    }
    
    // Draw visible area indicator
    const visibleTop = visibleAreaTop / CANVAS_HEIGHT * minimapHeight;
    const visibleHeight = visibleAreaHeight / CANVAS_HEIGHT * minimapHeight;
    
    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(0, visibleTop, minimapWidth, visibleHeight);
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