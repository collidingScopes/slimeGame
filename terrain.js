// Functions for terrain generation and management

// Create initial grid with terrain
function createGrid() {
  grid = [];
  originalGrid = [];
  moldSpots = [];
  
  // Start with all grass
  for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[y] = [];
      originalGrid[y] = [];
      
      for (let x = 0; x < GRID_WIDTH; x++) {
          grid[y][x] = TERRAIN.GRASS;
          originalGrid[y][x] = TERRAIN.GRASS;
      }
  }
  
  // Create natural terrain clusters
  createNaturalTerrain();
}

// Create natural looking terrain with proper clustering
function createNaturalTerrain() {
  // Create a few larger lakes
  createClusters(TERRAIN.WATER, 4, 35, 20);
  
  // Create some smaller ponds
  createClusters(TERRAIN.WATER, 7, 12, 6);
  
  // Create large forest clusters
  createClusters(TERRAIN.TREE, 5, 40, 25);
  
  // Create medium tree groups
  createClusters(TERRAIN.TREE, 8, 18, 10);
  
  // Create smaller tree groups
  createClusters(TERRAIN.TREE, 12, 8, 4);
  
  // Create decorative rock formations
  createClusters(TERRAIN.ROCK, 10, 7, 3);
  
  // Create sand borders around water
  createSandBorders();
  
  // Create villages with houses and roads
  createVillages(5); // 5 villages in the larger world
  
  // Add some path-like features
  createPaths(3); // Create more connecting paths
  
  // Save the natural terrain as original
  for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
          originalGrid[y][x] = grid[y][x];
      }
  }
}

// Create clusters of a specific terrain type
function createClusters(terrainType, numClusters, maxSize, minSize) {
  for (let c = 0; c < numClusters; c++) {
      const startX = Math.floor(Math.random() * GRID_WIDTH);
      const startY = Math.floor(Math.random() * GRID_HEIGHT);
      const size = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
      
      const queue = [{x: startX, y: startY}];
      const placed = new Set();
      placed.add(`${startX},${startY}`);
      
      while (queue.length > 0 && placed.size < size) {
          const idx = Math.floor(Math.random() * queue.length);
          const current = queue[idx];
          queue.splice(idx, 1);
          
          grid[current.y][current.x] = terrainType;
          
          // Get all neighbors, including diagonals for more natural clustering
          const neighbors = getAllNeighbors(current.x, current.y);
          for (const neighbor of neighbors) {
              const key = `${neighbor.x},${neighbor.y}`;
              // Higher probability for natural clustering
              const probability = terrainType === TERRAIN.WATER ? 0.9 : 
                                 terrainType === TERRAIN.TREE ? 0.85 : 0.75;
                                 
              if (!placed.has(key) && Math.random() < probability) {
                  queue.push(neighbor);
                  placed.add(key);
              }
          }
      }
  }
}

// Create sand borders around water
function createSandBorders() {
  const sandPositions = [];
  
  for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
          if (grid[y][x] === TERRAIN.WATER) {
              const neighbors = getAllNeighbors(x, y);
              for (const neighbor of neighbors) {
                  if (grid[neighbor.y][neighbor.x] !== TERRAIN.WATER && 
                      grid[neighbor.y][neighbor.x] !== TERRAIN.SAND && 
                      Math.random() < 0.9) {
                      sandPositions.push({x: neighbor.x, y: neighbor.y});
                  }
              }
          }
      }
  }
  
  for (const pos of sandPositions) {
      if (grid[pos.y][pos.x] !== TERRAIN.WATER && grid[pos.y][pos.x] !== TERRAIN.HOUSE && grid[pos.y][pos.x] !== TERRAIN.ROAD) {
          grid[pos.y][pos.x] = TERRAIN.SAND;
      }
  }
}

// Create villages with houses and roads
function createVillages(numVillages) {
  for (let v = 0; v < numVillages; v++) {
      // Find a suitable location for the village (preferably on grass)
      let centerX, centerY;
      let attempts = 0;
      
      do {
          centerX = Math.floor(Math.random() * (GRID_WIDTH - 8)) + 4;
          centerY = Math.floor(Math.random() * (GRID_HEIGHT - 8)) + 4;
          attempts++;
      } while (grid[centerY][centerX] !== TERRAIN.GRASS && attempts < 50);
      
      // Village size
      const villageSize = Math.floor(Math.random() * 6) + 7; // 7-12 buildings
      const villageRadius = Math.floor(villageSize / 2) + 2;
      
      // Create road network first
      createRoadNetwork(centerX, centerY, villageRadius);
      
      // Place houses around the roads
      placeHouses(centerX, centerY, villageSize, villageRadius);
  }
}

// Create a road network for a village
function createRoadNetwork(centerX, centerY, radius) {
  // Create main road in one direction
  const isHorizontal = Math.random() < 0.5;
  
  if (isHorizontal) {
      // Horizontal main road
      for (let x = centerX - radius; x <= centerX + radius; x++) {
          if (x >= 0 && x < GRID_WIDTH) {
              grid[centerY][x] = TERRAIN.ROAD;
          }
      }
      
      // Create 2-3 perpendicular side roads
      const numSideRoads = Math.floor(Math.random() * 2) + 2;
      const sideRoadPositions = [];
      
      for (let i = 0; i < numSideRoads; i++) {
          const roadX = centerX - radius + Math.floor(Math.random() * (radius * 2));
          if (roadX >= 0 && roadX < GRID_WIDTH) {
              sideRoadPositions.push(roadX);
          }
      }
      
      // Create the side roads
      for (const roadX of sideRoadPositions) {
          const length = Math.floor(Math.random() * 3) + 2;
          const direction = Math.random() < 0.5 ? -1 : 1;
          
          for (let y = 1; y <= length; y++) {
              const roadY = centerY + (y * direction);
              if (roadY >= 0 && roadY < GRID_HEIGHT) {
                  grid[roadY][roadX] = TERRAIN.ROAD;
              }
          }
      }
  } else {
      // Vertical main road
      for (let y = centerY - radius; y <= centerY + radius; y++) {
          if (y >= 0 && y < GRID_HEIGHT) {
              grid[y][centerX] = TERRAIN.ROAD;
          }
      }
      
      // Create 2-3 perpendicular side roads
      const numSideRoads = Math.floor(Math.random() * 2) + 2;
      const sideRoadPositions = [];
      
      for (let i = 0; i < numSideRoads; i++) {
          const roadY = centerY - radius + Math.floor(Math.random() * (radius * 2));
          if (roadY >= 0 && roadY < GRID_HEIGHT) {
              sideRoadPositions.push(roadY);
          }
      }
      
      // Create the side roads
      for (const roadY of sideRoadPositions) {
          const length = Math.floor(Math.random() * 3) + 2;
          const direction = Math.random() < 0.5 ? -1 : 1;
          
          for (let x = 1; x <= length; x++) {
              const roadX = centerX + (x * direction);
              if (roadX >= 0 && roadX < GRID_WIDTH) {
                  grid[roadY][roadX] = TERRAIN.ROAD;
              }
          }
      }
  }
}

// Place houses around roads in a village
function placeHouses(centerX, centerY, villageSize, radius) {
  const housesPlaced = new Set();
  let attempts = 0;
  let housesToPlace = villageSize;
  
  while (housesToPlace > 0 && attempts < 100) {
      // Pick a location within the village radius
      const offsetX = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      const offsetY = Math.floor(Math.random() * (radius * 2 + 1)) - radius;
      
      const houseX = centerX + offsetX;
      const houseY = centerY + offsetY;
      
      const key = `${houseX},${houseY}`;
      
      // Check if position is valid and near a road
      if (houseX >= 0 && houseX < GRID_WIDTH && 
          houseY >= 0 && houseY < GRID_HEIGHT && 
          !housesPlaced.has(key) && 
          grid[houseY][houseX] !== TERRAIN.ROAD && 
          grid[houseY][houseX] !== TERRAIN.WATER && 
          grid[houseY][houseX] !== TERRAIN.HOUSE && 
          isAdjacentToRoad(houseX, houseY)) {
          
          grid[houseY][houseX] = TERRAIN.HOUSE;
          housesPlaced.add(key);
          housesToPlace--;
      }
      
      attempts++;
  }
}

// Check if a position is adjacent to a road
function isAdjacentToRoad(x, y) {
  const neighbors = getNeighbors(x, y);
  for (const neighbor of neighbors) {
      if (neighbor.x >= 0 && neighbor.x < GRID_WIDTH && 
          neighbor.y >= 0 && neighbor.y < GRID_HEIGHT && 
          grid[neighbor.y][neighbor.x] === TERRAIN.ROAD) {
          return true;
      }
  }
  return false;
}

// Create path-like features across the map
function createPaths(count = 2) {
  // Create paths connecting different areas
  const numPaths = count;
  
  for (let p = 0; p < numPaths; p++) {
      // Choose two distant points to connect
      let startX, startY, endX, endY;
      
      // Start point (prefer near edges)
      if (Math.random() < 0.5) {
          startX = Math.random() < 0.5 ? 1 : GRID_WIDTH - 2;
          startY = Math.floor(Math.random() * GRID_HEIGHT);
      } else {
          startX = Math.floor(Math.random() * GRID_WIDTH);
          startY = Math.random() < 0.5 ? 1 : GRID_HEIGHT - 2;
      }
      
      // End point (try to choose a distant point)
      endX = GRID_WIDTH - startX - 1;
      endY = GRID_HEIGHT - startY - 1;
      
      // A* pathfinding with some randomness to create natural-looking paths
      createPathBetween(startX, startY, endX, endY);
  }
}

// Create a path between two points using A* with randomness
function createPathBetween(startX, startY, endX, endY) {
  const openSet = [{ 
      x: startX, 
      y: startY, 
      g: 0, 
      h: Manhattan(startX, startY, endX, endY),
      f: Manhattan(startX, startY, endX, endY) 
  }];
  
  const closedSet = new Set();
  const cameFrom = {};
  
  while (openSet.length > 0) {
      // Find node with lowest f score
      let lowestIndex = 0;
      for (let i = 0; i < openSet.length; i++) {
          if (openSet[i].f < openSet[lowestIndex].f) {
              lowestIndex = i;
          }
      }
      
      const current = openSet[lowestIndex];
      
      // Check if reached end
      if (current.x === endX && current.y === endY) {
          // Reconstruct path and place road tiles
          let pathX = current.x;
          let pathY = current.y;
          
          while (pathX !== startX || pathY !== startY) {
              const key = `${pathX},${pathY}`;
              
              // Only place road on grass or sand
              if ((grid[pathY][pathX] === TERRAIN.GRASS || 
                   grid[pathY][pathX] === TERRAIN.SAND) && 
                  Math.random() < 0.85) {  // 85% chance to place road for some randomness
                  grid[pathY][pathX] = TERRAIN.ROAD;
              }
              
              const prev = cameFrom[key];
              pathX = prev.x;
              pathY = prev.y;
          }
          
          // Place road at start
          if (grid[startY][startX] === TERRAIN.GRASS || grid[startY][startX] === TERRAIN.SAND) {
              grid[startY][startX] = TERRAIN.ROAD;
          }
          
          return;
      }
      
      // Remove current from open set
      openSet.splice(lowestIndex, 1);
      
      // Add to closed set
      closedSet.add(`${current.x},${current.y}`);
      
      // Check neighbors
      const neighbors = getNeighbors(current.x, current.y);
      for (const neighbor of neighbors) {
          const nx = neighbor.x;
          const ny = neighbor.y;
          
          // Skip if in closed set
          if (closedSet.has(`${nx},${ny}`)) continue;
          
          // Skip if not traversable terrain (can't go through water or rocks)
          if (grid[ny][nx] === TERRAIN.WATER || grid[ny][nx] === TERRAIN.ROCK) continue;
          
          // Calculate g score (distance from start)
          const tentativeG = current.g + 1;
          
          // Check if neighbor is in open set
          const existingIndex = openSet.findIndex(node => node.x === nx && node.y === ny);
          
          if (existingIndex === -1) {
              // Not in open set, add it
              const h = Manhattan(nx, ny, endX, endY);
              
              // Add some randomness to make natural-looking paths
              const randomFactor = Math.random() * 2;
              
              openSet.push({
                  x: nx,
                  y: ny,
                  g: tentativeG,
                  h: h,
                  f: tentativeG + h + randomFactor
              });
              
              cameFrom[`${nx},${ny}`] = { x: current.x, y: current.y };
          } else if (tentativeG < openSet[existingIndex].g) {
              // Better path found
              openSet[existingIndex].g = tentativeG;
              openSet[existingIndex].f = tentativeG + openSet[existingIndex].h;
              cameFrom[`${nx},${ny}`] = { x: current.x, y: current.y };
          }
      }
  }
}

// Manhattan distance heuristic
function Manhattan(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

// Get valid neighbors for a cell (4 directions)
function getNeighbors(x, y) {
  const neighbors = [];
  const directions = [
      {dx: -1, dy: 0}, // left
      {dx: 1, dy: 0},  // right
      {dx: 0, dy: -1}, // up
      {dx: 0, dy: 1}   // down
  ];
  
  for (const dir of directions) {
      const newX = x + dir.dx;
      const newY = y + dir.dy;
      
      if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
          neighbors.push({x: newX, y: newY});
      }
  }
  
  return neighbors;
}

// Get all neighbors including diagonals (8 directions)
function getAllNeighbors(x, y) {
  const neighbors = [];
  for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = x + dx;
          const newY = y + dy;
          
          if (newX >= 0 && newX < GRID_WIDTH && newY >= 0 && newY < GRID_HEIGHT) {
              neighbors.push({x: newX, y: newY});
          }
      }
  }
  return neighbors;
}