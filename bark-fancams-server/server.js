// server.js - Main server file (No Rounds Version)
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Socket.io configuration with CORS
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      /\.ngrok\.io$/,
      /\.ngrok-free\.app$/,
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      /\.ngrok\.io$/,
      /\.ngrok-free\.app$/,
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Game Server Class
class AudioBattleServer {
  constructor() {
    this.waitingPlayers = [];
    this.activeGames = new Map();
    this.playerToGame = new Map();
    this.socketToPlayer = new Map();
    this.gameStats = {
      totalGames: 0,
      totalConnections: 0,
      peakPlayers: 0,
    };
  }

  // Player Management
  addPlayer(socket) {
    const player = {
      id: socket.id,
      socket: socket,
      joinTime: Date.now(),
      isReady: false,
      stats: { gamesPlayed: 0, wins: 0, totalTime: 0 },
    };

    this.socketToPlayer.set(socket.id, player);
    this.gameStats.totalConnections++;
    this.updatePeakPlayers();

    console.log(
      `🎮 Player ${socket.id} connected. Total: ${this.getCurrentPlayerCount()}`
    );
    return player;
  }

  removePlayer(socketId) {
    // Remove from queue
    this.removeFromQueue(socketId);

    // Handle active game
    this.handlePlayerDisconnect(socketId);

    // Clean up mappings
    this.socketToPlayer.delete(socketId);
    this.playerToGame.delete(socketId);

    console.log(
      `👋 Player ${socketId} disconnected. Total: ${this.getCurrentPlayerCount()}`
    );
  }

  setPlayerReady(socket) {
    const currentPlayer = this.socketToPlayer.get(socket.id);
    if (currentPlayer) {
      this.socketToPlayer.set(socket.id, {
        ...currentPlayer,
        isReady: true,
      });
    } else {
      this.addPlayer(socket);
    }
  }

  // Queue Management
  joinQueue(socket) {
    // Remove from existing queue first
    this.removeFromQueue(socket.id);

    const player = this.socketToPlayer.get(socket.id);
    if (!player) return null;

    this.waitingPlayers.push(player);
    console.log(
      `📋 Player ${socket.id} joined queue. Queue size: ${this.waitingPlayers.length}`
    );

    // Try to create match
    if (this.waitingPlayers.length >= 2) {
      return this.createMatch();
    }

    return { queuePosition: this.waitingPlayers.length, waiting: true };
  }

  removeFromQueue(socketId) {
    const originalLength = this.waitingPlayers.length;
    this.waitingPlayers = this.waitingPlayers.filter(
      (player) => player.id !== socketId
    );

    if (this.waitingPlayers.length !== originalLength) {
      console.log(
        `📤 Player ${socketId} removed from queue. Queue size: ${this.waitingPlayers.length}`
      );
    }
  }

  // Game Creation and Management
  createMatch() {
    if (this.waitingPlayers.length < 2) return null;

    const player1 = this.waitingPlayers.shift();
    const player2 = this.waitingPlayers.shift();

    const gameId = `game_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 6)}`;

    const game = {
      id: gameId,
      players: {
        [player1.id]: {
          id: player1.id,
          peakVolume: 0,
          lastPeak: 0,
          lastPeakTime: 0,
          totalVolume: 0,
          peakCount: 0,
          isReady: false,
        },
        [player2.id]: {
          id: player2.id,
          peakVolume: 0,
          lastPeak: 0,
          lastPeakTime: 0,
          totalVolume: 0,
          peakCount: 0,
          isReady: false,
        },
      },
      status: "active",
      gameDuration: 30000, // 30 seconds total
      startTime: Date.now(),
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    // Setup game mappings
    this.activeGames.set(gameId, game);
    this.playerToGame.set(player1.id, gameId);
    this.playerToGame.set(player2.id, gameId);

    // Join socket rooms
    player1.socket.join(gameId);
    player2.socket.join(gameId);

    // Update stats
    this.gameStats.totalGames++;
    player1.stats.gamesPlayed++;
    player2.stats.gamesPlayed++;

    console.log(`🎯 Game ${gameId} created: ${player1.id} vs ${player2.id}`);

    player1.socket.emit("setup");
    player2.socket.emit("setup");

    // Send game start events
    const gameStartData = {
      gameId: gameId,
      gameDuration: game.gameDuration,
      startTime: game.startTime,
    };

    player1.socket.emit("gameStart", {
      ...gameStartData,
      yourId: player1.id,
      opponentId: player2.id,
    });

    player2.socket.emit("gameStart", {
      ...gameStartData,
      yourId: player2.id,
      opponentId: player1.id,
    });

    // Start game timer
    this.startGameTimer(gameId);

    // return { gameId, matched: true };
  }

  // Audio Processing
  handleAudioPeak(socket, data) {
    const gameId = this.playerToGame.get(socket.id);
    const game = this.activeGames.get(gameId);

    if (!game || game.status !== "active") {
      return;
    }

    const { peak } = data;
    const playerId = socket.id;
    const now = Date.now();

    // Validate peak data
    if (typeof peak !== "number" || peak < 0 || peak > 1) {
      return;
    }

    // Update player's peak data
    if (game.players[playerId]) {
      const player = game.players[playerId];
      player.lastPeak = peak;
      player.lastPeakTime = now;
      player.totalVolume += peak;
      player.peakCount++;

      // Update peak volume if this is higher
      if (peak > player.peakVolume) {
        player.peakVolume = peak;
      }

      game.lastActivity = now;
    }

    // Broadcast to opponent only
    socket.to(gameId).emit("opponentAudioPeak", {
      playerId: playerId,
      peak: peak,
      timestamp: now,
    });
  }

  // Game Timer
  startGameTimer(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    setTimeout(() => {
      this.endGame(gameId);
    }, game.gameDuration);
  }

  // Game End
  endGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    game.status = "finished";
    game.endTime = Date.now();
    game.actualDuration = game.endTime - game.startTime;

    // Calculate winner based on peak volume
    const players = Object.values(game.players);
    const winner = players.reduce((prev, current) =>
      current.peakVolume > prev.peakVolume ? current : prev
    );

    // Check for tie
    const winnerId =
      players[0].peakVolume === players[1].peakVolume ? null : winner.id;

    // Update player stats
    if (winnerId) {
      const winnerPlayer = this.socketToPlayer.get(winnerId);
      if (winnerPlayer) {
        winnerPlayer.stats.wins++;
      }
    }

    Object.keys(game.players).forEach((playerId) => {
      const player = this.socketToPlayer.get(playerId);
      if (player) {
        player.stats.totalTime += game.actualDuration;
      }
    });

    const gameResult = {
      gameId: gameId,
      winner: winnerId,
      players: game.players,
      duration: game.actualDuration,
      reason: "timeEnd",
    };

    io.to(gameId).emit("gameEnd", gameResult);

    console.log(`🎊 Game ${gameId} ended. Winner: ${winnerId || "Tie"}`);

    // Cleanup after delay
    setTimeout(() => {
      this.cleanupGame(gameId);
    }, 30000);
  }

  cleanupGame(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return;

    // Remove player mappings
    Object.keys(game.players).forEach((playerId) => {
      this.playerToGame.delete(playerId);
    });

    this.activeGames.delete(gameId);
    console.log(`🧹 Game ${gameId} cleaned up`);
  }

  handlePlayerDisconnect(socketId) {
    const gameId = this.playerToGame.get(socketId);
    if (!gameId) return;

    const game = this.activeGames.get(gameId);
    if (!game || game.status !== "active") return;

    // Notify opponent
    const opponentId = Object.keys(game.players).find((id) => id !== socketId);
    if (opponentId) {
      io.to(opponentId).emit("opponentDisconnected", {
        message: "Your opponent disconnected. You win!",
      });

      // End game with opponent as winner
      game.status = "finished";
      game.endTime = Date.now();

      const gameResult = {
        gameId: gameId,
        winner: opponentId,
        players: game.players,
        duration: game.endTime - game.startTime,
        reason: "disconnect",
      };

      io.to(opponentId).emit("gameEnd", gameResult);
    }
  }

  // Utility Methods
  getCurrentPlayerCount() {
    return this.socketToPlayer.size;
  }

  updatePeakPlayers() {
    const current = this.getCurrentPlayerCount();
    if (current > this.gameStats.peakPlayers) {
      this.gameStats.peakPlayers = current;
    }
  }

  getServerStats() {
    return {
      ...this.gameStats,
      currentPlayers: this.getCurrentPlayerCount(),
      queueSize: this.waitingPlayers.length,
      activeGames: this.activeGames.size,
      uptime: process.uptime(),
    };
  }
}

// Initialize game server
const gameServer = new AudioBattleServer();

// Socket.io event handlers
io.on("connection", (socket) => {
  // Add player to server
  gameServer.addPlayer(socket);

  // Send connection confirmation
  socket.emit("connected", {
    playerId: socket.id,
    serverTime: Date.now(),
    message: "Connected to Audio Battle server!",
  });

  // Join queue
  socket.on("joinQueue", () => {
    try {
      const result = gameServer.joinQueue(socket);

      if (result?.matched) {
        // Game created successfully
        socket.emit("queueResult", {
          success: true,
          matched: true,
          gameId: result.gameId,
        });
      } else if (result?.waiting) {
        // Added to queue
        socket.emit("queueResult", {
          success: true,
          waiting: true,
          position: result.queuePosition,
          message: `Position ${result.queuePosition} in queue`,
        });
      } else {
        socket.emit("queueResult", {
          success: false,
          message: "Failed to join queue",
        });
      }
    } catch (error) {
      console.error("Join queue error:", error);
      socket.emit("error", { message: "Failed to join queue" });
    }
  });

  // Leave queue
  socket.on("leaveQueue", () => {
    gameServer.removeFromQueue(socket.id);
    socket.emit("queueLeft", { message: "Left queue successfully" });
  });

  socket.on("setReady", (data) => {
    // set current player to be ready
    gameServer.setPlayerReady(socket.id);
  });

  // socket.on("startGame", (data) => {
  //   const gameId = gameServer.playerToGame.get(socket.id);
  //   if (gameId) {
  //     const player1 = gameServer.activeGames.get(gameId).player1;
  //     const player2 = gameServer.activeGames.get(gameId).player2;

  //     if (player1.isReady && player2.isReady) {

  //     }
  //   }
  // });

  // Handle audio peaks
  socket.on("audioPeak", (data) => {
    try {
      gameServer.handleAudioPeak(socket, data);
    } catch (error) {
      console.error("Audio peak error:", error);
    }
  });

  // Ping/Pong for latency testing
  socket.on("ping", (timestamp) => {
    socket.emit("pong", timestamp);
  });

  // Get player stats
  socket.on("getStats", () => {
    const player = gameServer.socketToPlayer.get(socket.id);
    socket.emit("playerStats", player?.stats || {});
  });

  // Handle disconnect
  socket.on("disconnect", (reason) => {
    console.log(`Player ${socket.id} disconnected: ${reason}`);
    gameServer.removePlayer(socket.id);
  });

  // Error handling
  socket.on("error", (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// REST API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    ...gameServer.getServerStats(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/stats", (req, res) => {
  res.json(gameServer.getServerStats());
});

// Serve basic HTML client for testing
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Audio Battle Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .status { background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
            .endpoint { background: #f9f9f9; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>🎮 Audio Battle Server (No Rounds)</h1>
        <div class="status">
            <h3>✅ Server is running!</h3>
            <p>Socket.io server ready for connections</p>
            <p>Current time: ${new Date().toLocaleString()}</p>
        </div>
        
        <h3>API Endpoints:</h3>
        <div class="endpoint">
            <strong>GET /api/health</strong> - Server health check
        </div>
        <div class="endpoint">
            <strong>GET /api/stats</strong> - Live server statistics
        </div>
        
        <h3>Socket Events:</h3>
        <ul>
            <li><strong>joinQueue</strong> - Join matchmaking queue</li>
            <li><strong>leaveQueue</strong> - Leave queue</li>
            <li><strong>audioPeak</strong> - Send audio peak data</li>
            <li><strong>ping</strong> - Latency test</li>
        </ul>
        
        <p>Game lasts 30 seconds, winner determined by highest peak volume!</p>
    </body>
    </html>
  `);
});

// Start server
const PORT = process.env.PORT || 5173;

server.listen(PORT, () => {
  console.log(`🚀 Audio Battle Server running on port ${PORT}`);
  console.log(`🌐 Socket.io server ready for connections`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎮 Simplified game: 30 seconds, highest peak wins!`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, gameServer };
