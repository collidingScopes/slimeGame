// Functions for mold management

// Note: Most of these functions have been moved to game.js
// This file is kept for compatibility, but many functions are just stubs
// that call the corresponding functions in game.js

// Simplified cleansing effect for better performance
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
    // Only redraw the affected cell if it exists
    if (y >= 0 && y < grid.length && x >= 0 && x < grid[y].length) {
      const terrainType = grid[y][x];
      
      // Draw base color
      ctx.fillStyle = TERRAIN_COLORS[terrainType];
      ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      
      // Draw pattern
      drawTerrainPattern(x, y, terrainType);
      
      // Draw grid line
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
  }, 100);
}