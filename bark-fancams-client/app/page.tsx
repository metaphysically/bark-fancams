"use client";

import { useState, useEffect } from "react";
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

  // Simulate opponent behavior
  useEffect(() => {
    if (gameState === "game") {
      const interval = setInterval(() => {
        // Random opponent volume that occasionally spikes
        const newVolume = Math.random() * 50 + (Math.random() > 0.9 ? 40 : 0);
        setOpponentVolume(newVolume);

        // Update peak volume if current is higher
        if (newVolume > peakOpponentVolume) {
          setPeakOpponentVolume(newVolume);
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, [gameState, peakOpponentVolume]);

  // Handle game state transitions
  const startQueue = () => {
    setGameState("queue");
    setQueuePosition(Math.floor(Math.random() * 5) + 1);

    setTimeout(() => {
      startGame(); // Use startNewGame instead of setGameState("setup")
    }, 3000);
  };

  // For transitioning from setup to game (keeps existing peaks)
  const startGame = () => {
    setGameState("game");

    // Simulate game ending after video duration
    setTimeout(() => {
      setGameState("results");
    }, 30000);
  };

  const showResults = () => {
    setGameState("results");
  };

  // Update player's peak volume
  const updateVolume = (volume: number) => {
    setPlayerVolume(volume);
    setPeakPlayerVolume((currentPeak) => {
      if (volume > currentPeak) {
        return volume;
      }
      return currentPeak;
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="w-full max-w-md mx-auto h-screen flex flex-col">
        <header className="p-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-pink-500">Bark</span> Battle
          </h1>
        </header>

        <div className="flex-1 w-full">
          {gameState === "queue" && (
            <QueueScreen
              onStartGame={startGame}
              playersOnline={playersOnline}
              queuePosition={queuePosition}
            />
          )}

          {gameState === "setup" && (
            <SetupScreen
              onReady={startGame}
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
