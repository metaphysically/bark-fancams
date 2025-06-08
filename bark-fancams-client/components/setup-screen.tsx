"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, CheckCircle, AlertCircle } from "lucide-react";
import VolumeBar from "@/components/volume-bar";

interface SetupScreenProps {
  onReady: () => void;
  updateVolume: (volume: number) => void;
  currentVolume: number;
}

export default function SetupScreen({
  onReady,
  updateVolume,
  currentVolume,
}: SetupScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Initialize audio context and request microphone access
  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        setMicPermission(true);

        // Create audio context
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        // Create data array for volume analysis
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        // Connect microphone to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        // Start volume monitoring
        requestAnimationFrame(checkVolume);
      } catch (error) {
        console.error("Error accessing microphone:", error);
        setMicPermission(false);
      }
    };

    initAudio();

    return () => {
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Function to check volume levels
  const checkVolume = () => {
    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      // Calculate volume (average of frequency data)
      let sum = 0;
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        sum += dataArrayRef.current[i];
      }
      const avgVolume = sum / dataArrayRef.current.length;

      // Scale volume (0-100)
      const scaledVolume = Math.min(100, avgVolume * 1.5);
      updateVolume(scaledVolume);

      requestAnimationFrame(checkVolume);
    }
  };

  // Handle ready state and countdown
  useEffect(() => {
    if (isReady && !opponentReady) {
      // Simulate opponent getting ready
      const timer = setTimeout(() => {
        setOpponentReady(true);
      }, 2000);

      return () => clearTimeout(timer);
    }

    if (isReady && opponentReady && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }

    if (isReady && opponentReady && countdown === 0) {
      onReady();
    }
  }, [isReady, opponentReady, countdown, onReady]);

  const handleReady = () => {
    setIsReady(true);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <h2 className="text-3xl font-bold mb-6">Microphone Setup</h2>

      {micPermission === false && (
        <div className="bg-red-900/50 p-4 rounded-lg mb-6 flex items-center">
          <AlertCircle className="w-6 h-6 text-red-400 mr-2" />
          <p>
            Microphone access denied. Please allow microphone access to play.
          </p>
        </div>
      )}

      {micPermission === true && (
        <>
          <div className="mb-8 w-full max-w-xs">
            <p className="mb-2 text-purple-200">Test your microphone:</p>
            <div className="flex items-center justify-center gap-4">
              <Mic className="w-6 h-6 text-pink-400" />
              <VolumeBar
                volume={currentVolume}
                height={80}
                width={200}
                orientation="horizontal"
              />
            </div>
            <p className="mt-2 text-sm text-purple-300">
              Make some noise to see if your microphone is working!
            </p>
          </div>

          {!isReady ? (
            <Button
              onClick={handleReady}
              disabled={currentVolume < 10}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full text-lg transition-all"
            >
              I'm Ready!
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-400 mr-1" />
                  <span>You</span>
                </div>

                {opponentReady ? (
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mr-1" />
                    <span>Opponent</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-yellow-500 animate-pulse mr-1"></div>
                    <span>Waiting for opponent...</span>
                  </div>
                )}
              </div>

              {opponentReady && (
                <div className="text-2xl font-bold text-pink-400">
                  Starting in {countdown}...
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
