// Functions for rendering the game

// Draw only the visible part of the grid plus buffer
function drawGrid() {
  // Calculate which cells are currently visible
  const startRow = Math.max(0, Math.floor(visibleAreaTop / CELL_SIZE) - VIEWPORT_BUFFER);
  const visibleRows = Math.ceil(visibleAreaHeight / CELL_SIZE) + VIEWPORT_BUFFER * 2;
  const endRow = Math.min(GRID_HEIGHT, startRow + visibleRows);
  
  // Clear only the visible portion of the canvas
  ctx.clearRect(0, startRow * CELL_SIZE, CANVAS_WIDTH, (endRow - startRow) * CELL_SIZE);
  
  // Draw only visible cells
  for (let y = startRow; y < endRow; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
          const terrainType = grid[y][x];
          
          // Draw the terrain
          ctx.fillStyle = TERRAIN_COLORS[terrainType];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          
          // Optimization: Only draw patterns for visible cells, simplified for better performance
          drawTerrainPattern(x, y, terrainType);
          
          // Draw grid lines
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
  }
}

// Pre-render terrain patterns to image caches for better performance
const patternCache = {};

// Initialize pattern cache
function initPatternCache() {
  // Create cached pattern renderings for each terrain type
  for (let type = 0; type < TERRAIN_COLORS.length; type++) {
      const cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = CELL_SIZE;
      cacheCanvas.height = CELL_SIZE;
      const cacheCtx = cacheCanvas.getContext('2d');
      
      // Draw base color
      cacheCtx.fillStyle = TERRAIN_COLORS[type];
      cacheCtx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);
      
      // Draw pattern for this terrain type
      drawTerrainPatternToCache(cacheCtx, type);
      
      // Store in cache
      patternCache[type] = cacheCanvas;
  }
}

// Draw terrain pattern to cache
function drawTerrainPatternToCache(ctx, terrainType) {
  // Use a stable seed for consistent patterns
  const seed = terrainType * 1000;
  
  switch (terrainType) {
      case TERRAIN.GRASS:
          // Draw grass details - simplified pattern
          ctx.fillStyle = '#85d85b';
          for (let i = 0; i < 4; i++) {
              for (let j = 0; j < 4; j++) {
                  if ((i + j) % 3 !== 0) {
                      ctx.fillRect(8 + i * 8, 8 + j * 8, 2, 2);
                  }
              }
          }
          break;
          
      case TERRAIN.TREE:
          // Draw tree trunk
          ctx.fillStyle = '#6b4423';
          ctx.fillRect(CELL_SIZE/3, CELL_SIZE/2, CELL_SIZE/3, CELL_SIZE/2);
          
          // Draw tree foliage
          ctx.fillStyle = '#3e8948';
          ctx.beginPath();
          ctx.moveTo(CELL_SIZE/2, 5);
          ctx.lineTo(CELL_SIZE - 8, CELL_SIZE/2);
          ctx.lineTo(8, CELL_SIZE/2);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#52a15c';
          ctx.beginPath();
          ctx.moveTo(CELL_SIZE/2, 8);
          ctx.lineTo(CELL_SIZE/2 + 8, CELL_SIZE/3);
          ctx.lineTo(CELL_SIZE/2 - 8, CELL_SIZE/3);
          ctx.closePath();
          ctx.fill();
          break;
          
      case TERRAIN.WATER:
          // Draw water with simpler pattern
          ctx.fillStyle = '#74c0f0';
          for (let i = 0; i < 3; i++) {
              ctx.fillRect(0, 10 + i * 10, CELL_SIZE, 3);
          }
          break;
          
      case TERRAIN.SAND:
          // Draw sand with speckled pattern
          ctx.fillStyle = '#f0e4b8';
          for (let i = 0; i < 12; i++) {
              const sandX = (seed + i * 3) % CELL_SIZE;
              const sandY = (seed + i * 7) % CELL_SIZE;
              ctx.fillRect(sandX, sandY, 2, 2);
          }
          break;
          
      case TERRAIN.ROCK:
          // Draw rock formation
          ctx.fillStyle = '#8b7b70';
          ctx.beginPath();
          ctx.moveTo(CELL_SIZE/2, 10);
          ctx.lineTo(CELL_SIZE - 10, CELL_SIZE - 10);
          ctx.lineTo(10, CELL_SIZE - 10);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#9f8d80';
          ctx.beginPath();
          ctx.arc(CELL_SIZE/2 - 5, CELL_SIZE/2 - 5, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
          
      case TERRAIN.HOUSE:
          // Draw house
          ctx.fillStyle = '#f5d7b2';
          ctx.fillRect(5, 15, CELL_SIZE - 10, CELL_SIZE - 20);
          
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.moveTo(0, 15);
          ctx.lineTo(CELL_SIZE/2, 0);
          ctx.lineTo(CELL_SIZE, 15);
          ctx.closePath();
          ctx.fill();
          
          ctx.fillStyle = '#8c4f2f';
          ctx.fillRect(CELL_SIZE/2 - 5, CELL_SIZE - 15, 10, 10);
          
          ctx.fillStyle = '#87ceeb';
          ctx.fillRect(10, 20, 8, 8);
          ctx.fillRect(CELL_SIZE - 18, 20, 8, 8);
          break;
          
      case TERRAIN.ROAD:
          // Draw road texture
          ctx.fillStyle = '#776660';
          for (let i = 0; i < 8; i++) {
              const dotX = (seed + i * 11) % CELL_SIZE;
              const dotY = (seed + i * 13) % CELL_SIZE;
              ctx.fillRect(dotX, dotY, 3, 3);
          }
          
          ctx.fillStyle = '#a89088';
          ctx.fillRect(0, CELL_SIZE/2 - 1, CELL_SIZE, 2);
          break;
      
      case TERRAIN.MOLD:
          // Draw mold pattern
          ctx.fillStyle = '#000000';
          for (let i = 0; i < 10; i++) {
              const moldX = (seed + i * 13) % CELL_SIZE;
              const moldY = (seed + i * 17) % CELL_SIZE;
              const size = (i % 4) + 2;
              ctx.beginPath();
              ctx.arc(moldX, moldY, size, 0, Math.PI * 2);
              ctx.fill();
          }
          
          ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
          ctx.beginPath();
          ctx.arc(CELL_SIZE/2, CELL_SIZE/2, 15, 0, Math.PI * 2);
          ctx.fill();
          break;
  }
}

// Draw terrain pattern using the cache
function drawTerrainPattern(x, y, terrainType) {
  // Use cached pattern if available
  if (patternCache[terrainType]) {
      ctx.drawImage(patternCache[terrainType], x * CELL_SIZE, y * CELL_SIZE);
      return;
  }
  
  // Fallback if cache not ready
  const xPos = x * CELL_SIZE;
  const yPos = y * CELL_SIZE;
  
  // Draw a simplified version
  ctx.fillStyle = TERRAIN_COLORS[terrainType];
  ctx.fillRect(xPos, yPos, CELL_SIZE, CELL_SIZE);
}