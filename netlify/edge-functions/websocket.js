// Edge Function for WebSocket support in Netlify
// This should be placed in netlify/edge-functions/websocket.js

// Game state to be shared across all connections
let gameState = {
  moldSpots: [],
  defeatedCount: 0,
  difficulty: 1,
  seed: Math.floor(Math.random() * 1000000) // Generate a random seed for terrain generation
};

// Map to store active connections
const connections = new Map();
let playerCount = 0;

// Helper function to broadcast to all clients
function broadcast(message, exceptConnectionId = null) {
  const payload = JSON.stringify(message);
  
  for (const [id, socket] of connections.entries()) {
    if (id !== exceptConnectionId && socket.readyState === 1) { // WebSocket.OPEN = 1
      socket.send(payload);
    }
  }
}

// Helper function to broadcast game state to all clients
function broadcastGameState() {
  const stateData = {
    type: 'gameState',
    playerCount,
    moldSpots: gameState.moldSpots,
    defeatedCount: gameState.defeatedCount,
    difficulty: gameState.difficulty,
    seed: gameState.seed
  };
  
  broadcast(stateData);
}

// Adjust difficulty based on player count
function adjustDifficulty() {
  if (playerCount > 0) {
    // Base difficulty + additional difficulty per player
    const baseDifficulty = 1;
    const playerFactor = 0.2; // Additional difficulty per player
    
    gameState.difficulty = baseDifficulty + (playerCount - 1) * playerFactor;
    
    // Limit max difficulty
    if (gameState.difficulty > 5) {
      gameState.difficulty = 5;
    }
  }
}

export default async function handler(request, context) {
  // Only handle WebSocket connections
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }
  
  try {
    // Upgrade the connection to a WebSocket
    const { socket, response } = Deno.upgradeWebSocket(request);
    
    // Generate a unique ID for this connection
    const connectionId = crypto.randomUUID();
    
    // Set up event handlers
    socket.onopen = () => {
      console.log(`WebSocket opened: ${connectionId}`);
      
      // Store the connection
      connections.set(connectionId, socket);
      playerCount++;
      
      // Adjust difficulty based on player count
      adjustDifficulty();
      
      // Send initial game state to the new player
      socket.send(JSON.stringify({
        type: 'init',
        playerId: connectionId,
        gameState: {
          playerCount,
          moldSpots: gameState.moldSpots,
          defeatedCount: gameState.defeatedCount,
          difficulty: gameState.difficulty,
          seed: gameState.seed
        }
      }));
      
      // Broadcast updated player count to all clients
      broadcastGameState();
    };
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'removeMold':
            // Handle mold removal
            const { x, y } = data;
            
            // Find and remove the mold spot
            const spotIndex = gameState.moldSpots.findIndex(spot => 
              spot.x === x && spot.y === y);
            
            if (spotIndex !== -1) {
              gameState.moldSpots.splice(spotIndex, 1);
              gameState.defeatedCount++;
              
              // Create a player action message
              const actionMessage = {
                type: 'gameState',
                playerCount,
                moldSpots: gameState.moldSpots,
                defeatedCount: gameState.defeatedCount,
                difficulty: gameState.difficulty,
                playerAction: {
                  type: 'removeMold',
                  player: connectionId.substring(0, 4),
                  x,
                  y
                }
              };
              
              // Broadcast the action to all clients
              broadcast(actionMessage, connectionId);
            }
            break;
            
          case 'addMold':
            // Handle new mold spot
            gameState.moldSpots.push({
              x: data.x,
              y: data.y,
              size: data.size || 1,
              growthRate: data.growthRate || 1
            });
            
            // Broadcast updated game state
            broadcastGameState();
            break;
          
          case 'growMold':
            // Handle mold growth
            if (data.moldSpots && Array.isArray(data.moldSpots)) {
              gameState.moldSpots = data.moldSpots;
              
              // Broadcast updated game state
              broadcastGameState();
            }
            break;
            
          case 'ping':
            // Simple ping response to keep connection alive
            socket.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };
    
    socket.onclose = () => {
      console.log(`WebSocket closed: ${connectionId}`);
      
      // Remove the connection
      connections.delete(connectionId);
      playerCount = Math.max(0, playerCount - 1);
      
      // Adjust difficulty based on player count
      adjustDifficulty();
      
      // Broadcast updated player count to all clients
      broadcastGameState();
    };
    
    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
    };
    
    return response;
  } catch (error) {
    console.error('Error handling WebSocket connection:', error);
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}