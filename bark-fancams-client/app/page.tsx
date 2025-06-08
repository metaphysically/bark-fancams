"use client";

import { useState, useEffect } from "react";
import { useSocket } from "@/contexts/SocketContext";
import QueueScreen from "@/components/queue-screen";
import SetupScreen from "@/components/setup-screen";
import GameScreen from "@/components/game-screen";
import ResultsScreen from "@/components/results-screen";

export default function BarkBattle() {
  // Video IDs extracted from the YouTube embeds
  const VIDEO_IDS = [
    "LDXU5K4GiG0", // First video
    "v7LpKUBu5wE", // Second video
    "mZUNlVqkL8o", // Third video
    "2fGuqx3CHVQ", // Fourth video
    "eRRQjCDdZWM", // Fifth video
  ];

  // Game state management
  const [gameState, setGameState] = useState<
    "queue" | "setup" | "game" | "results"
  >("queue");
  const [playerVolume, setPlayerVolume] = useState(0);
  const [opponentVolume, setOpponentVolume] = useState(0);
  const [peakPlayerVolume, setPeakPlayerVolume] = useState(0);
  const [peakOpponentVolume, setPeakOpponentVolume] = useState(0);
  const [playersOnline, setPlayersOnline] = useState(
    Math.floor(Math.random() * 50) + 20
  );
  const [queuePosition, setQueuePosition] = useState(0);
  const [videoId, setVideoId] = useState(() => {
    const randomIndex = Math.floor(Math.random() * VIDEO_IDS.length);
    return VIDEO_IDS[randomIndex];
  });

  // WebSocket integration
  const {
    socket,
    connectionStatus,
    gameState: socketGameState,
    gameData,
    queuePosition: socketQueuePosition,
    opponentAudioPeak,
    joinQueue,
    leaveQueue,
    setReady,
    setStartGame,
    sendAudioPeak,
  } = useSocket();

  // Sync WebSocket game state with local UI state
  useEffect(() => {
    switch (socketGameState) {
      case "disconnected":
      case "connecting":
        // Stay on queue screen while connecting
        break;
      case "connected":
        setGameState("queue");
        break;
      case "queued":
        // Stay on queue screen but show searching state
        break;
      case "setup":
        // Go to setup first, then game
        if (gameState === "queue") {
          setGameState("setup");
        }
        break;
      case "playing":
        setGameState("game");
        break;
      case "finished":
        setGameState("results");
        break;
    }
  }, [socketGameState, gameState]);

  // Handle opponent audio data from WebSocket
  // useEffect(() => {
  //   if (opponentAudioPeak > 0) {
  //     const opponentVolumePercent = opponentAudioPeak * 100;
  //     setOpponentVolume(opponentVolumePercent);

  //     // Update peak volume if current is higher
  //     if (opponentVolumePercent > peakOpponentVolume) {
  //       setPeakOpponentVolume(opponentVolumePercent);
  //     }
  //   }
  // }, [opponentAudioPeak, peakOpponentVolume]);

  // Listen for game end events from WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleGameEnd = (result: any) => {
      console.log("🎊 Game ended:", result);
      setGameState("results");

      // Update peak volumes from server data if available
      if (result.players && gameData) {
        const yourData = result.players[gameData.yourId];
        const opponentData = result.players[gameData.opponentId];

        if (yourData) {
          setPeakPlayerVolume(yourData.peakVolume * 100);
        }
        // if (opponentData) {
        //   setPeakOpponentVolume(opponentData.peakVolume * 100);
        // }
      }
    };

    const handleOpponentDisconnected = () => {
      console.log("👋 Opponent disconnected");
      setGameState("results");
    };

    socket.on("gameEnd", handleGameEnd);
    socket.on("opponentDisconnected", handleOpponentDisconnected);

    return () => {
      socket.off("gameEnd", handleGameEnd);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
    };
  }, [socket, gameData]);

  // Simulate opponent behavior (fallback when no real opponent)
  // useEffect(() => {
  //   if (gameState === "game" && !opponentAudioPeak) {
  //     const interval = setInterval(() => {
  //       // Random opponent volume that occasionally spikes
  //       const newVolume = Math.random() * 50 + (Math.random() > 0.9 ? 40 : 0);
  //       setOpponentVolume(newVolume);

  //       // Update peak volume if current is higher
  //       if (newVolume > peakOpponentVolume) {
  //         setPeakOpponentVolume(newVolume);
  //       }
  //     }, 200);

  //     return () => clearInterval(interval);
  //   }
  // }, [gameState, peakOpponentVolume, opponentAudioPeak]);

  // Handle game state transitions
  const startQueue = () => {
    setGameState("queue");
    // Reset game state
    setPeakPlayerVolume(0);
    setPeakOpponentVolume(0);
    setPlayerVolume(0);
    // setOpponentVolume(0);

    // Pick new random video
    const randomIndex = Math.floor(Math.random() * VIDEO_IDS.length);
    setVideoId(VIDEO_IDS[randomIndex]);

    // Set random queue position for fallback
    setQueuePosition(Math.floor(Math.random() * 5) + 1);
    joinQueue();
  };

  // Called when user clicks "Find Match" in QueueScreen
  const handleFindMatch = () => {
    if (connectionStatus === "connected") {
      joinQueue();
    } else {
      // Fallback: simulate old behavior if not connected
      console.log("Not connected to server, using fallback");
      setTimeout(() => {
        startGame();
      }, 3000);
    }
  };

  // For transitioning from setup to game
  const startGame = () => {
    setGameState("game");

    // Fallback timeout only if not connected to WebSocket
    if (connectionStatus !== "connected") {
      setTimeout(() => {
        setGameState("results");
      }, 30000);
    }
    // If connected, server will handle game end timing
  };

  const showResults = () => {
    setGameState("results");
  };

  // Update player's volume and send to WebSocket
  const updateVolume = (volume: number) => {
    setPlayerVolume(volume);
    setPeakPlayerVolume((currentPeak) => {
      if (volume > currentPeak) {
        return volume;
      }
      return currentPeak;
    });

    // Send to WebSocket server (normalize to 0-1 range)
    if (socketGameState === "playing" && volume > 10) {
      const normalizedPeak = volume / 100;
      sendAudioPeak(normalizedPeak);
    }
  };

  // Calculate effective queue position and searching state
  const effectiveQueuePosition = socketQueuePosition || queuePosition;
  const isSearching =
    socketGameState === "queued" ||
    (connectionStatus !== "connected" && gameState === "queue");
  const isMatched = socketGameState === "playing";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="w-full max-w-md mx-auto h-screen flex flex-col">
        <header className="p-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-pink-500">Bark</span> Battle
          </h1>
          {/* Connection status indicator */}
          <div className="mt-1">
            {connectionStatus === "connecting" && (
              <span className="text-xs text-yellow-400">Connecting...</span>
            )}
            {connectionStatus === "connected" && (
              <span className="text-xs text-green-400">• Online</span>
            )}
            {connectionStatus === "disconnected" && (
              <span className="text-xs text-red-400">• Offline</span>
            )}
            {connectionStatus === "error" && (
              <span className="text-xs text-red-400">Connection Error</span>
            )}
          </div>
        </header>

        <div className="flex-1 w-full">
          {gameState === "queue" && (
            <QueueScreen
              onStartGame={handleFindMatch}
              playersOnline={playersOnline}
              queuePosition={effectiveQueuePosition}
              isSearching={isSearching}
              isMatched={isMatched}
              connectionStatus={connectionStatus}
            />
          )}

          {gameState === "setup" && (
            <SetupScreen
              onReady={setReady}
              onStart={setStartGame}
              updateVolume={updateVolume}
              currentVolume={playerVolume}
            />
          )}

          {gameState === "game" && (
            <GameScreen
              videoId={videoId}
              playerVolume={playerVolume}
              opponentVolume={opponentVolume}
              updateVolume={updateVolume}
              onGameEnd={showResults}
              peakPlayerVolume={peakPlayerVolume}
              peakOpponentVolume={peakOpponentVolume}
            />
          )}

          {gameState === "results" && (
            <ResultsScreen
              playerVolume={peakPlayerVolume}
              opponentVolume={peakOpponentVolume}
              onPlayAgain={startQueue}
            />
          )}
        </div>
      </div>
    </main>
  );
}
