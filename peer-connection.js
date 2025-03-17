// Peer Connection Manager for P2P Multiplayer
// Uses PeerJS to establish WebRTC connections without a custom server

class PeerConnectionManager {
  constructor() {
      this.peer = null;
      this.peerId = null;
      this.connections = {};
      this.hostId = null;
      this.isHost = false;
      this.onPlayerJoin = null;
      this.onPlayerLeave = null;
      this.onGameStateUpdate = null;
      this.onBecomeHost = null;
      this.connectionStatusElement = document.getElementById('connection-status');
      this.lobbyIdElement = document.getElementById('lobby-id');
      this.joinLobbyElement = document.getElementById('join-lobby');
      this.playerCountElement = document.getElementById('player-count');
  }

  // Initialize peer connection
  async init() {
      this.updateConnectionStatus('Connecting to PeerJS server...', 'connecting');

      try {
          // Use PeerJS's cloud server instead of Heroku
          this.peer = new Peer(null, {
              debug: 1,
              config: {
                  'iceServers': [
                      { urls: 'stun:stun.l.google.com:19302' },
                      { urls: 'stun:stun1.l.google.com:19302' }
                  ]
              }
          });

          // Set up event listeners
          this.peer.on('open', (id) => this.handlePeerOpen(id));
          this.peer.on('connection', (conn) => this.handleIncomingConnection(conn));
          this.peer.on('error', (err) => this.handlePeerError(err));
          this.peer.on('disconnected', () => this.handlePeerDisconnected());
          
          // Set up join lobby button
          this.joinLobbyElement.addEventListener('click', () => {
              const lobbyId = prompt('Enter Lobby ID:');
              if (lobbyId) {
                  this.joinLobby(lobbyId);
              }
          });
      } catch (error) {
          console.error('Failed to create Peer:', error);
          this.updateConnectionStatus('Failed to connect', 'error');
      }
  }

  // Handle peer open event
  handlePeerOpen(id) {
      this.peerId = id;
      this.lobbyIdElement.textContent = id;
      this.updateConnectionStatus('Connected (Share your Lobby ID with others)', 'connected');
      console.log('My peer ID is: ' + id);
      
      // Become the host when first connected
      this.becomeHost();
  }

  // Handle incoming connection
  handleIncomingConnection(conn) {
      console.log('Incoming connection from:', conn.peer);
      
      // Set up connection handlers
      this.setupConnectionHandlers(conn);
      
      // Store the connection
      this.connections[conn.peer] = conn;
      
      // Update player count
      this.updatePlayerCount();
      
      // If we're the host, send the current game state to the new player
      if (this.isHost && this.onPlayerJoin) {
          this.onPlayerJoin(conn.peer);
      }
  }

  // Set up handlers for a connection
  setupConnectionHandlers(conn) {
      conn.on('data', (data) => this.handleConnectionData(conn.peer, data));
      
      conn.on('close', () => {
          console.log('Connection closed with peer:', conn.peer);
          delete this.connections[conn.peer];
          this.updatePlayerCount();
          
          // If the host disconnected, need to elect a new host
          if (conn.peer === this.hostId) {
              this.electNewHost();
          }
          
          // Notify game about player leaving
          if (this.onPlayerLeave) {
              this.onPlayerLeave(conn.peer);
          }
      });
      
      conn.on('error', (err) => {
          console.error('Connection error:', err);
          delete this.connections[conn.peer];
          this.updatePlayerCount();
      });
  }

  // Handle peer error event
  handlePeerError(err) {
      console.error('Peer error:', err);
      this.updateConnectionStatus('Connection error: ' + err.type, 'error');
  }

  // Handle peer disconnected event
  handlePeerDisconnected() {
      console.log('Disconnected from server, attempting to reconnect...');
      this.updateConnectionStatus('Disconnected, reconnecting...', 'disconnected');
      
      // Try to reconnect
      setTimeout(() => {
          if (this.peer) {
              this.peer.reconnect();
          }
      }, 3000);
  }

  // Join an existing lobby
  joinLobby(hostId) {
      if (hostId === this.peerId) {
          alert('Cannot connect to yourself!');
          return;
      }
      
      console.log('Attempting to join lobby:', hostId);
      this.updateConnectionStatus('Connecting to lobby...', 'connecting');
      
      // Connect to the host
      const conn = this.peer.connect(hostId, {
          reliable: true
      });
      
      // Set up connection handlers
      conn.on('open', () => {
          console.log('Connected to host:', hostId);
          this.setupConnectionHandlers(conn);
          this.connections[hostId] = conn;
          this.hostId = hostId;
          this.isHost = false;
          this.updateConnectionStatus('Connected to lobby', 'connected');
          this.updatePlayerCount();
          
          // Request initial game state
          conn.send({
              type: 'requestGameState'
          });
      });
      
      conn.on('error', (err) => {
          console.error('Connection error:', err);
          this.updateConnectionStatus('Failed to connect to lobby', 'error');
      });
  }

  // Handle connection data
  handleConnectionData(peerId, data) {
      console.log('Received data from', peerId, ':', data);
      
      switch (data.type) {
          case 'gameState':
              // Forward game state to game logic
              if (this.onGameStateUpdate) {
                  this.onGameStateUpdate(data.data);
              }
              break;
              
          case 'requestGameState':
              // Send current game state to requester (only if we're the host)
              if (this.isHost && this.onPlayerJoin) {
                  this.onPlayerJoin(peerId);
              }
              break;
              
          case 'hostChange':
              // We've been designated as the new host
              if (data.newHostId === this.peerId) {
                  this.becomeHost();
              } else {
                  this.hostId = data.newHostId;
              }
              break;
              
          case 'removeMold':
              // Forward mold removal to game logic
              if (this.isHost && this.onGameStateUpdate) {
                  this.onGameStateUpdate({
                      type: 'removeMold',
                      x: data.x,
                      y: data.y,
                      playerId: peerId
                  });
              }
              break;
      }
  }

  // Become the host
  becomeHost() {
      console.log('Becoming host');
      this.isHost = true;
      this.hostId = this.peerId;
      
      if (this.onBecomeHost) {
          this.onBecomeHost();
      }
      
      // Notify all connections that we're the host
      this.broadcast({
          type: 'hostChange',
          newHostId: this.peerId
      });
  }

  // Elect a new host when the current one disconnects
  electNewHost() {
      // Get all peer IDs
      const peerIds = Object.keys(this.connections);
      
      if (peerIds.length > 0) {
          // Choose the first connected peer as the new host
          this.hostId = peerIds[0];
          
          // Notify all peers about the new host
          this.broadcast({
              type: 'hostChange',
              newHostId: this.hostId
          });
      } else {
          // No other peers, become the host
          this.becomeHost();
      }
  }

  // Broadcast data to all connected peers
  broadcast(data) {
      for (const peerId in this.connections) {
          this.connections[peerId].send(data);
      }
  }

  // Send data to a specific peer
  send(peerId, data) {
      if (this.connections[peerId]) {
          this.connections[peerId].send(data);
      }
  }

  // Update connection status UI
  updateConnectionStatus(message, className) {
      if (this.connectionStatusElement) {
          this.connectionStatusElement.textContent = message;
          this.connectionStatusElement.className = className;
      }
  }

  // Update player count UI
  updatePlayerCount() {
      const count = Object.keys(this.connections).length + 1; // +1 for self
      if (this.playerCountElement) {
          this.playerCountElement.textContent = count;
      }
      return count;
  }

  // Cleanup when closing
  cleanup() {
      if (this.peer) {
          this.peer.destroy();
      }
      this.connections = {};
  }
}

// Export the manager class
window.PeerConnectionManager = PeerConnectionManager;