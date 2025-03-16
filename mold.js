// Functions for mold management

// Spawn a new mold spot with optimized algorithm
function spawnMold() {
  if (gameOver) return;
  
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
  
  // Increase difficulty over time
  if (moldSpots.length > 0 && moldSpots.length % 5 === 0) {
      difficulty++;
      difficultyEl.textContent = difficulty;
      moldSpawnRate = Math.max(1000, moldSpawnRate - 500);
      moldGrowthRate = Math.max(1000, moldGrowthRate - 500);
  }
}

// Grow existing mold spots with optimized algorithm
function growMold() {
  if (gameOver) return;
  
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
}

// Optimized game over check
function checkGameOver() {
  // Use sampling to estimate mold coverage for better performance
  const totalCells = GRID_WIDTH * GRID_HEIGHT;
  
  // If we have a ton of mold spots, highly likely the game is over
  if (moldSpots.length >= totalCells * 0.9) {
      endGame();
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
          endGame();
      }
  }
}

// Handle mold removal when clicked with optimized effect
function removeMold(cellX, cellY) {
  if (grid[cellY][cellX] === TERRAIN.MOLD) {
      grid[cellY][cellX] = originalGrid[cellY][cellX];
      
      // Remove from mold spots - find index first for performance
      let spotIndex = -1;
      for (let i = 0; i < moldSpots.length; i++) {
          if (moldSpots[i] && moldSpots[i].x === cellX && moldSpots[i].y === cellY) {
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
      updateScoreboard();
      
      // Simplified cleansing effect for better performance
      createSimpleCleansingEffect(cellX, cellY);
      
      return true;
  }
  
  return false;
}

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

// Create cleansing effect when removing mold (original animation - kept for reference)
function createCleansingEffect(x, y) {
  const centerX = x * CELL_SIZE + CELL_SIZE / 2;
  const centerY = y * CELL_SIZE + CELL_SIZE / 2;
  
  // Draw expanding circle
  let radius = 5;
  const maxRadius = CELL_SIZE;
  const interval = setInterval(() => {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + (1 - radius/maxRadius) + ')';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      radius += 3;
      if (radius >= maxRadius) {
          clearInterval(interval);
      }
  }, 30);
}