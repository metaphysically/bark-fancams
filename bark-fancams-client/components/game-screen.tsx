"use client";

import { useState, useEffect, useRef } from "react";
import VolumeBar from "@/components/volume-bar";
import { Crown } from "lucide-react";

interface GameScreenProps {
  videoId: string;
  playerVolume: number;
  opponentVolume: number;
  updateVolume: (volume: number) => void;
  onGameEnd: () => void;
  peakPlayerVolume: number;
  peakOpponentVolume: number;
}

export default function GameScreen({
  videoId,
  playerVolume,
  // opponentVolume,
  updateVolume,
  onGameEnd,
  peakPlayerVolume,
  peakOpponentVolume,
}: GameScreenProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [encouragement, setEncouragement] = useState("");
  const playerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Initialize YouTube player
  useEffect(() => {
    // Load YouTube API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize player when API is ready
    (window as any).onYouTubeIframeAPIReady = () => {
      new (window as any).YT.Player("youtube-player", {
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            setIsLoaded(true);
          },
          onStateChange: (event: any) => {
            // Video ended
            if (event.data === 0) {
              onGameEnd();
            }
          },
        },
      });
    };

    // Initialize audio processing
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

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
      }
    };

    initAudio();

    // Countdown timer
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
    };
  }, [videoId, onGameEnd]);

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

  // Random encouragement messages
  useEffect(() => {
    const messages = [
      "BARK LOUDER!",
      "GO CRAZY!",
      "BARK NOW!",
      // "YOU'RE WINNING!",
      "MORE VOLUME!",
      "SHOW YOUR LOVE!",
      "BARK FOR CHAEWON!",
      "MAKE SOME NOISE!",
    ];

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * messages.length);
      setEncouragement(messages[randomIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      {/* Video player */}
      <div className="relative w-full aspect-video bg-black">
        <div id="youtube-player" className="w-full h-full"></div>

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Encouragement overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`bg-pink-600/80 px-6 py-3 rounded-full text-2xl font-bold transform transition-all duration-300 ${
              encouragement ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
          >
            {encouragement}
          </div>
        </div>

        {/* Timer */}
        <div className="absolute top-2 right-2 bg-black/70 px-3 py-1 rounded-full text-sm">
          {timeRemaining}s
        </div>
      </div>

      {/* Volume meters */}
      <div className="flex-1 flex items-stretch p-4 gap-4">
        {/* Player volume */}
        <div className="flex-1 flex flex-col items-center">
          {/* <div className="mb-2 flex items-center">
            <span className="font-bold mr-2">YOU</span>
            {peakPlayerVolume > peakOpponentVolume && (
              <Crown className="w-5 h-5 text-yellow-400" />
            )}
          </div> */}
          <div className="flex-1 flex items-center justify-center w-full">
            <VolumeBar
              volume={playerVolume}
              height={200}
              width={60}
              orientation="vertical"
              peakVolume={peakPlayerVolume}
            />
          </div>
          <div className="mt-2 text-lg font-bold">
            {Math.round(peakPlayerVolume)}
          </div>
        </div>

        {/* Opponent volume */}
        {/* <div className="flex-1 flex flex-col items-center">
          <div className="mb-2 flex items-center">
            <span className="font-bold mr-2">OPPONENT</span>
            {peakOpponentVolume > peakPlayerVolume && <Crown className="w-5 h-5 text-yellow-400" />}
          </div>
          <div className="flex-1 flex items-center justify-center w-full">
            <VolumeBar
              volume={opponentVolume}
              height={200}
              width={60}
              orientation="vertical"
              peakVolume={peakOpponentVolume}
            />
          </div>
          <div className="mt-2 text-lg font-bold">{Math.round(peakOpponentVolume)}</div>
        </div> */}
      </div>
    </div>
  );
}
