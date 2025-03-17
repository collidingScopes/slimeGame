// Game constants
const CELL_SIZE = 40;
const GRID_WIDTH = 25;
const GRID_HEIGHT = 400;
const CANVAS_WIDTH = CELL_SIZE * GRID_WIDTH;
const CANVAS_HEIGHT = CELL_SIZE * GRID_HEIGHT;

// Viewport settings for rendering optimization
const VIEWPORT_BUFFER = 8; // Extra rows to render beyond visible area

// Terrain types
const TERRAIN = {
    GRASS: 0,
    TREE: 1,
    WATER: 2,
    SAND: 3,
    ROCK: 4,
    MOLD: 5,
    HOUSE: 6,
    ROAD: 7
};

// Colors for different terrains
const TERRAIN_COLORS = [
    '#63c74d', // Grass - brighter, more vibrant green
    '#3e8948', // Tree - forest green
    '#50a5de', // Water - bright blue
    '#e7d19e', // Sand - light sandy color
    '#8b7b70', // Rock - natural brown-gray
    '#333333', // Mold
    '#e74c3c', // House - red roofs
    '#8e7970'  // Road - brown path
];

// Initial difficulty settings
const INITIAL_MOLD_SPAWN_RATE = 5000; // ms
const INITIAL_MOLD_GROWTH_RATE = 8000; // ms