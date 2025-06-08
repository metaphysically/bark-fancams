// contexts/SocketContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

// Type definitions
export interface Player {
  id: string;
  score: number;
  lastPeak: number;
  lastPeakTime: number;
  roundsWon: number;
}

export interface GameData {
  gameId: string;
  yourId: string;
  opponentId: string;
  gameDuration: number;
  startTime: number;
  videoId: string;
}

export interface GameEndResult {
  gameId: string;
  winner: string | null;
  players: Record<
    string,
    {
      id: string;
      peakVolume: number;
      lastPeak: number;
      lastPeakTime: number;
      totalVolume: number;
      peakCount: number;
    }
  >;
  duration: number;
  reason: "timeEnd" | "disconnect";
}

export interface OpponentAudioData {
  playerId: string;
  peak: number;
  timestamp: number;
}

export interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  totalRounds: number;
}

export type GameState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "queued"
  | "setup"
  | "playing"
  | "finished";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// Socket context interface
interface SocketContextType {
  // Connection
  socket: Socket | null;
  connectionStatus: ConnectionStatus;

  // Game state
  gameState: GameState;
  gameData: GameData | null;
  playerStats: PlayerStats | null;

  // Audio data
  opponentAudioPeak: number;

  // Queue
  queuePosition: number | null;

  // Actions
  joinQueue: () => void;
  leaveQueue: () => void;
  setReady: () => void;
  setStartGame: () => void;
  sendAudioPeak: (peak: number) => void;
  sendChatMessage: (message: string) => void;
  getPlayerStats: () => void;

  // Event handlers (for components to override)
  onGameStart?: (data: GameData) => void;
  onGameEnd?: (result: GameEndResult) => void;
  onOpponentAudioPeak?: (data: OpponentAudioData) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onOpponentDisconnected?: () => void;
}

// Create context
const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Provider props
interface SocketProviderProps {
  children: ReactNode;
  serverUrl?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({
  children,
  serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL ||
    "https://46e0-4-32-66-130.ngrok-free.app/",
}) => {
  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [gameState, setGameState] = useState<GameState>("disconnected");
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [opponentAudioPeak, setOpponentAudioPeak] = useState<number>(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);

  // Event handler refs (so components can set custom handlers)
  const [eventHandlers, setEventHandlers] = useState<{
    onGameStart?: (data: GameData) => void;
    onGameEnd?: (result: GameEndResult) => void;
    onOpponentAudioPeak?: (data: OpponentAudioData) => void;
    onChatMessage?: (message: ChatMessage) => void;
    onOpponentDisconnected?: () => void;
  }>({});

  // Initialize socket connection
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    setConnectionStatus("connecting");

    const newSocket = io(serverUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on("connect", () => {
      console.log("🎮 Connected to game server");
      setConnectionStatus("connected");
      setGameState("connected");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from server:", reason);
      setConnectionStatus("disconnected");
      setGameState("disconnected");
      setGameData(null);
      setQueuePosition(null);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionStatus("error");
    });

    // Server events
    newSocket.on(
      "connected",
      (data: { playerId: string; serverTime: number }) => {
        console.log("✅ Server confirmed connection:", data);
      }
    );

    // Queue events
    newSocket.on(
      "queueResult",
      (data: {
        success: boolean;
        matched?: boolean;
        waiting?: boolean;
        position?: number;
        gameId?: string;
        message?: string;
      }) => {
        if (data.matched) {
          setGameState("playing");
          setQueuePosition(null);
        } else if (data.waiting) {
          setGameState("queued");
          setQueuePosition(data.position || null);
        }
      }
    );

    newSocket.on("queueLeft", () => {
      setGameState("connected");
      setQueuePosition(null);
    });

    newSocket.on("setup", () => {
      console.log("Players are setting up");
      setGameState("setup");
    });

    // Game events
    newSocket.on("gameStart", (data: GameData) => {
      console.log("🎯 Game started:", data);
      setGameState("playing");
      setGameData(data);
      setQueuePosition(null);
      eventHandlers.onGameStart?.(data);
    });

    newSocket.on("gameEnd", (result: GameEndResult) => {
      console.log("🎊 Game ended:", result);
      setGameState("finished");
      setGameData(null);
      eventHandlers.onGameEnd?.(result);
    });

    // Audio events
    newSocket.on("opponentAudioPeak", (data: OpponentAudioData) => {
      setOpponentAudioPeak(data.peak);
      eventHandlers.onOpponentAudioPeak?.(data);

      // Auto-decay opponent peak
      setTimeout(() => {
        setOpponentAudioPeak((prev) => prev * 0.7);
      }, 100);
    });

    // Chat events
    newSocket.on("chatMessage", (message: ChatMessage) => {
      eventHandlers.onChatMessage?.(message);
    });

    // Disconnect events
    newSocket.on("opponentDisconnected", (data: { message: string }) => {
      console.log("👋 Opponent disconnected:", data.message);
      eventHandlers.onOpponentDisconnected?.();
      setGameState("connected");
      setGameData(null);
    });

    // Player stats
    newSocket.on("playerStats", (stats: PlayerStats) => {
      setPlayerStats(stats);
    });

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up socket connection");
      newSocket.close();
    };
  }, [serverUrl]);

  // Auto-decay opponent audio peak
  useEffect(() => {
    if (opponentAudioPeak > 0) {
      const timer = setTimeout(() => {
        setOpponentAudioPeak((prev) => Math.max(0, prev * 0.8));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [opponentAudioPeak]);

  // Action functions
  const joinQueue = () => {
    if (socket) {
      console.log("📋 Joining queue...");
      socket.emit("joinQueue");
    }
  };

  const leaveQueue = () => {
    if (socket && gameState === "queued") {
      console.log("📤 Leaving queue...");
      socket.emit("leaveQueue");
    }
  };

  const setReady = () => {
    if (socket && gameState === "queued") {
      console.log("Play is ready");
      socket.emit("setReady");
    }
  };

  const setStartGame = () => {
    if (socket) {
      console.log("Both players ready, starting game");
      socket.emit("startGame");
    }
  };

  const sendAudioPeak = (peak: number) => {
    if (socket) {
      console.log(`SocketContext: sending peak audio ${peak}`);
      socket.emit("audioPeak", { peak });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socket && gameData && message.trim()) {
      socket.emit("chatMessage", { message: message.trim() });
    }
  };

  const getPlayerStats = () => {
    if (socket) {
      socket.emit("getStats");
    }
  };

  // Context value
  const contextValue: SocketContextType = {
    // Connection
    socket,
    connectionStatus,

    // Game state
    gameState,
    gameData,
    playerStats,

    // Audio
    opponentAudioPeak,

    // Queue
    queuePosition,

    // Actions
    joinQueue,
    leaveQueue,
    setReady,
    setStartGame,
    sendAudioPeak,
    sendChatMessage,
    getPlayerStats,

    // Event handlers
    ...eventHandlers,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// Custom hook
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

// Higher-order component for pages that need socket
export const withSocket = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <SocketProvider>
      <Component {...props} />
    </SocketProvider>
  );

  WrappedComponent.displayName = `withSocket(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

// Custom hooks for specific game events
export const useGameEvents = (handlers: {
  onGameStart?: (data: GameData) => void;
  onGameEnd?: (result: GameEndResult) => void;
  onOpponentAudioPeak?: (data: OpponentAudioData) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onOpponentDisconnected?: () => void;
}) => {
  const context = useContext(SocketContext);

  useEffect(() => {
    if (context) {
      // This is a simplified approach - in practice you'd want to merge handlers
      Object.assign(context, handlers);
    }
  }, [handlers, context]);
};

export default SocketContext;
