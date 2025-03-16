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

// Initialize the canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

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
    
    // Initialize timers
    lastMoldTime = Date.now();
    lastMoldGrowth = Date.now();
    
    // Start game loop
    gameLoop();
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
    
    // Clear the canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw the grid
    drawGrid();
    
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
    
    // Continue the game loop
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.onload = initGame;