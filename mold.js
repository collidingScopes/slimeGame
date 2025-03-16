// Functions for mold management

// Spawn a new mold spot
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
          
          // Play sound if within visible area to alert player
          const cellTop = y * CELL_SIZE;
          const visibleBottom = visibleAreaTop + visibleAreaHeight;
          if (cellTop >= visibleAreaTop && cellTop <= visibleBottom) {
              playMoldAlert();
          }
          
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
  
  // Update indicators for players to find mold
  updateMoldIndicator();
}

// Play a sound alert when mold appears in visible area
function playMoldAlert() {
  // Create and play a short beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.value = 440;
  gainNode.gain.value = 0.1;
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  
  // Stop after a short duration
  setTimeout(() => {
      oscillator.stop();
  }, 200);
}

// Grow existing mold spots
function growMold() {
  if (gameOver) return;
  
  let totalGrowth = 0;
  
  for (let i = 0; i < moldSpots.length; i++) {
      const spot = moldSpots[i];
      
      // Skip dead spots
      if (!spot) continue;
      
      // Calculate growth factor based on spot size
      const growthFactor = Math.ceil(spot.size / 5);
      
      // Try to grow in random directions
      for (let g = 0; g < growthFactor; g++) {
          if (Math.random() < 0.3 * difficulty) {
              const directions = getAllNeighbors(spot.x, spot.y);
              const randomDir = directions[Math.floor(Math.random() * directions.length)];
              
              if (randomDir && grid[randomDir.y][randomDir.x] !== TERRAIN.MOLD) {
                  grid[randomDir.y][randomDir.x] = TERRAIN.MOLD;
                  moldSpots.push({
                      x: randomDir.x, 
                      y: randomDir.y, 
                      size: 1,
                      growthRate: spot.growthRate * 1.1
                  });
                  totalGrowth++;
                  spot.size++;
              }
          }
      }
  }
  
  // Update scoreboard
  updateScoreboard();
  
  // Check for game over
  const moldCount = moldSpots.length;
  const totalCells = GRID_WIDTH * GRID_HEIGHT;
  
  if (moldCount >= totalCells) {
      endGame();
  }
}

// Handle mold removal when clicked
function removeMold(cellX, cellY) {
  if (grid[cellY][cellX] === TERRAIN.MOLD) {
      grid[cellY][cellX] = originalGrid[cellY][cellX];
      
      // Remove from mold spots
      for (let i = 0; i < moldSpots.length; i++) {
          if (moldSpots[i] && moldSpots[i].x === cellX && moldSpots[i].y === cellY) {
              moldSpots.splice(i, 1);
              break;
          }
      }
      
      // Update score
      defeatedCount++;
      updateScoreboard();
      
      // Add cleansing effect animation
      createCleansingEffect(cellX, cellY);
      
      return true;
  }
  
  return false;
}

// Create cleansing effect when removing mold
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