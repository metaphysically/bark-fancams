"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Wifi, WifiOff } from "lucide-react";

interface QueueScreenProps {
  onStartGame: () => void;
  playersOnline: number;
  queuePosition: number;
  isSearching?: boolean;
  isMatched?: boolean;
  connectionStatus?: "connected" | "connecting" | "disconnected" | "error";
}

export default function QueueScreen({
  onStartGame,
  playersOnline,
  queuePosition,
  isSearching = false,
  isMatched = false,
  connectionStatus = "disconnected",
}: QueueScreenProps) {
  const [countdown, setCountdown] = useState(3);

  // Handle countdown when matched
  useEffect(() => {
    if (isMatched) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setCountdown(3); // Reset countdown
    }
  }, [isMatched]);

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="w-4 h-4 text-green-400" />;
      case "connecting":
        return <Wifi className="w-4 h-4 text-yellow-400 animate-pulse" />;
      default:
        return <WifiOff className="w-4 h-4 text-red-400" />;
    }
  };

  const getButtonState = () => {
    if (connectionStatus !== "connected") {
      return {
        disabled: true,
        text:
          connectionStatus === "connecting"
            ? "Connecting..."
            : "Connect to Server",
        className: "bg-gray-600 cursor-not-allowed",
      };
    }

    if (isSearching) {
      return {
        disabled: true,
        text: "Searching...",
        className: "bg-yellow-600 cursor-not-allowed",
      };
    }

    return {
      disabled: false,
      text: "Find Match",
      className: "bg-pink-600 hover:bg-pink-700 hover:scale-105",
    };
  };

  const buttonState = getButtonState();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-8">
        {/* Connection status */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-800/50 mb-2">
          {getConnectionIcon()}
          <span className="ml-2 text-sm">
            {connectionStatus === "connected"
              ? "Connected"
              : connectionStatus === "connecting"
              ? "Connecting"
              : "Offline"}
          </span>
        </div>

        {/* Players online */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-800/50 mb-2">
          <Users className="w-5 h-5 mr-2 text-pink-400" />
          <span className="text-pink-200">{playersOnline} players online</span>
        </div>

        <h2 className="text-4xl font-bold mb-2">Ready to Bark?</h2>
        <p className="text-purple-200 mb-8">
          Find an opponent and show off your barking skills!
        </p>
      </div>

      {/* Main content based on state */}
      {isMatched ? (
        <div className="animate-pulse">
          <h3 className="text-2xl font-bold text-green-400 mb-2">
            Opponent Found!
          </h3>
          <p className="text-purple-200">Starting in {countdown}...</p>
          <div className="mt-4">
            <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      ) : isSearching ? (
        <div>
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <h3 className="text-xl font-bold mb-2">Searching for opponent...</h3>
          <p className="text-purple-200">Queue position: {queuePosition}</p>

          {/* Fun waiting messages */}
          <div className="mt-4 text-sm text-purple-300">
            <p className="animate-pulse">
              Finding the perfect barking partner...
            </p>
          </div>
        </div>
      ) : (
        <Button
          onClick={onStartGame}
          disabled={buttonState.disabled}
          className={`text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform ${buttonState.className}`}
        >
          {buttonState.text}
        </Button>
      )}

      {/* Connection help text */}
      {connectionStatus !== "connected" && (
        <div className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-700/50">
          <p className="text-sm text-red-200">
            {connectionStatus === "connecting"
              ? "Connecting to game server..."
              : "Unable to connect to game server. Please check your connection."}
          </p>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-sm text-purple-300 mt-8">
          Get ready to bark at your favorite Chaewon fancam!
        </p>
      </div>
    </div>
  );
}
