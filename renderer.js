// Functions for rendering the game

// Draw the entire grid
function drawGrid() {
  for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
          const terrainType = grid[y][x];
          
          // Draw the terrain
          ctx.fillStyle = TERRAIN_COLORS[terrainType];
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          
          // Draw a custom pattern based on terrain type
          drawTerrainPattern(x, y, terrainType);
          
          // Draw grid lines
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
  }
}

// Draw custom patterns for each terrain type
function drawTerrainPattern(x, y, terrainType) {
  const xPos = x * CELL_SIZE;
  const yPos = y * CELL_SIZE;
  
  // Use a stable seed based on position for consistent patterns
  const seed = x * 1000 + y;
  
  switch (terrainType) {
      case TERRAIN.GRASS:
          // Draw grass details - little dots in a pattern
          ctx.fillStyle = '#85d85b'; // Lighter green dots
          
          // Create a subtle grid pattern of dots
          for (let i = 0; i < 4; i++) {
              for (let j = 0; j < 4; j++) {
                  // Use fixed positions based on cell coordinates
                  const grassX = xPos + 8 + i * 8;
                  const grassY = yPos + 8 + j * 8;
                  
                  // Small variation based on position
                  const offset = ((seed + i * j) % 5) - 2;
                  
                  // Only draw some dots for a less regular pattern
                  if ((i + j + x + y) % 3 !== 0) {
                      ctx.fillRect(grassX + offset, grassY + offset, 2, 2);
                  }
              }
          }
          break;
          
      case TERRAIN.TREE:
          // Draw tree trunk
          ctx.fillStyle = '#6b4423';
          ctx.fillRect(xPos + CELL_SIZE/3, yPos + CELL_SIZE/2, CELL_SIZE/3, CELL_SIZE/2);
          
          // Draw tree foliage - draw a more appealing tree shape
          ctx.fillStyle = '#3e8948';
          
          // Draw a rounded triangle for the tree foliage
          ctx.beginPath();
          ctx.moveTo(xPos + CELL_SIZE/2, yPos + 5); // Top point
          ctx.lineTo(xPos + CELL_SIZE - 8, yPos + CELL_SIZE/2); // Bottom right
          ctx.lineTo(xPos + 8, yPos + CELL_SIZE/2); // Bottom left
          ctx.closePath();
          ctx.fill();
          
          // Add a highlight
          ctx.fillStyle = '#52a15c';
          ctx.beginPath();
          ctx.moveTo(xPos + CELL_SIZE/2, yPos + 8);
          ctx.lineTo(xPos + CELL_SIZE/2 + 8, yPos + CELL_SIZE/3);
          ctx.lineTo(xPos + CELL_SIZE/2 - 8, yPos + CELL_SIZE/3);
          ctx.closePath();
          ctx.fill();
          break;
          
      case TERRAIN.WATER:
          // Draw water with subtle wave patterns
          // Light blue horizontal lines
          ctx.fillStyle = '#74c0f0';
          for (let i = 0; i < 4; i++) {
              const waveY = yPos + 8 + i * 8;
              
              // Create wavy water lines
              ctx.beginPath();
              ctx.moveTo(xPos, waveY);
              
              // Create gentle curves
              for (let wx = 0; wx <= CELL_SIZE; wx += 10) {
                  const offset = Math.sin((wx + seed) / 10) * 2;
                  ctx.lineTo(xPos + wx, waveY + offset);
              }
              
              ctx.lineTo(xPos + CELL_SIZE, waveY);
              ctx.lineTo(xPos + CELL_SIZE, waveY + 3);
              ctx.lineTo(xPos, waveY + 3);
              ctx.closePath();
              ctx.fill();
          }
          break;
          
      case TERRAIN.SAND:
          // Draw sand with speckled pattern
          ctx.fillStyle = '#f0e4b8'; // Lighter sand specks
          
          // Create a speckled pattern based on position
          for (let i = 0; i < 16; i++) {
              // Use consistent positions based on cell coordinates
              const sandX = xPos + ((seed + i * 3) % CELL_SIZE);
              const sandY = yPos + ((seed + i * 7) % CELL_SIZE);
              
              const size = (i % 3) + 1;
              ctx.fillRect(sandX, sandY, size, size);
          }
          break;
          
      case TERRAIN.ROCK:
          // Draw rock formation
          ctx.fillStyle = '#8b7b70';
          
          // Draw a rock shape
          ctx.beginPath();
          ctx.moveTo(xPos + CELL_SIZE/2, yPos + 10);
          ctx.lineTo(xPos + CELL_SIZE - 10, yPos + CELL_SIZE - 10);
          ctx.lineTo(xPos + 10, yPos + CELL_SIZE - 10);
          ctx.closePath();
          ctx.fill();
          
          // Add highlight
          ctx.fillStyle = '#9f8d80';
          ctx.beginPath();
          ctx.arc(xPos + CELL_SIZE/2 - 5, yPos + CELL_SIZE/2 - 5, 5, 0, Math.PI * 2);
          ctx.fill();
          break;
          
      case TERRAIN.HOUSE:
          // Draw house base
          ctx.fillStyle = '#f5d7b2'; // Wall color
          ctx.fillRect(xPos + 5, yPos + 15, CELL_SIZE - 10, CELL_SIZE - 20);
          
          // Draw house roof
          ctx.fillStyle = '#e74c3c'; // Red roof
          ctx.beginPath();
          ctx.moveTo(xPos, yPos + 15); // Left edge
          ctx.lineTo(xPos + CELL_SIZE/2, yPos); // Top point
          ctx.lineTo(xPos + CELL_SIZE, yPos + 15); // Right edge
          ctx.closePath();
          ctx.fill();
          
          // Draw door
          ctx.fillStyle = '#8c4f2f'; // Brown door
          ctx.fillRect(xPos + CELL_SIZE/2 - 5, yPos + CELL_SIZE - 15, 10, 10);
          
          // Draw window
          ctx.fillStyle = '#87ceeb'; // Sky blue window
          ctx.fillRect(xPos + 10, yPos + 20, 8, 8);
          ctx.fillRect(xPos + CELL_SIZE - 18, yPos + 20, 8, 8);
          break;
          
      case TERRAIN.ROAD:
          // Draw road texture
          ctx.fillStyle = '#8e7970'; // Base road color
          
          // Draw some darker specks for texture
          ctx.fillStyle = '#776660';
          for (let i = 0; i < 8; i++) {
              // Use deterministic positions
              const dotX = xPos + ((seed + i * 11) % CELL_SIZE);
              const dotY = yPos + ((seed + i * 13) % CELL_SIZE);
              ctx.fillRect(dotX, dotY, 3, 3);
          }
          
          // Add road edges/markings based on adjacent roads
          const hasRoadLeft = x > 0 && grid[y][x-1] === TERRAIN.ROAD;
          const hasRoadRight = x < GRID_WIDTH-1 && grid[y][x+1] === TERRAIN.ROAD;
          const hasRoadUp = y > 0 && grid[y-1][x] === TERRAIN.ROAD;
          const hasRoadDown = y < GRID_HEIGHT-1 && grid[y+1][x] === TERRAIN.ROAD;
          
          // If it's a horizontal road segment
          if (hasRoadLeft || hasRoadRight) {
              ctx.fillStyle = '#a89088'; // Lighter road marking
              ctx.fillRect(xPos, yPos + CELL_SIZE/2 - 1, CELL_SIZE, 2);
          }
          
          // If it's a vertical road segment
          if (hasRoadUp || hasRoadDown) {
              ctx.fillStyle = '#a89088'; // Lighter road marking
              ctx.fillRect(xPos + CELL_SIZE/2 - 1, yPos, 2, CELL_SIZE);
          }
          break;
      
      case TERRAIN.MOLD:
          // Draw mold with a stable pattern
          ctx.fillStyle = '#000000';
          
          // Create ominous mold patches
          for (let i = 0; i < 12; i++) {
              // Use deterministic positions for consistency
              const moldX = xPos + ((seed + i * 13) % CELL_SIZE);
              const moldY = yPos + ((seed + i * 17) % CELL_SIZE);
              
              const size = (i % 4) + 2;
              ctx.beginPath();
              ctx.arc(moldX, moldY, size, 0, Math.PI * 2);
              ctx.fill();
          }
          
          // Add a dark center without animation
          ctx.fillStyle = 'rgba(20, 20, 20, 0.7)';
          ctx.beginPath();
          ctx.arc(xPos + CELL_SIZE/2, yPos + CELL_SIZE/2, 15, 0, Math.PI * 2);
          ctx.fill();
          break;
  }
}