"use client"

import { Button } from "@/components/ui/button"
import { Share2, Trophy, Frown } from "lucide-react"
import VolumeBar from "@/components/volume-bar"

interface ResultsScreenProps {
  playerVolume: number
  opponentVolume: number
  onPlayAgain: () => void
}

export default function ResultsScreen({ playerVolume, opponentVolume, onPlayAgain }: ResultsScreenProps) {
  const playerWon = playerVolume > opponentVolume

  const handleShare = () => {
    // In a real app, this would generate a shareable link or image
    alert("Sharing functionality would be implemented here!")
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {/* Winner announcement */}
      <div className={`text-4xl font-bold mb-6 ${playerWon ? "text-green-400" : "text-red-400"}`}>
        {playerWon ? (
          <div className="flex flex-col items-center">
            <Trophy className="w-16 h-16 mb-2 text-yellow-400" />
            <span>YOU WIN!</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Frown className="w-16 h-16 mb-2 text-red-400" />
            <span>YOU LOSE!</span>
          </div>
        )}
      </div>

      {/* Match statistics */}
      <div className="w-full max-w-xs mb-8">
        <h3 className="text-xl font-bold mb-4">Battle Results</h3>

        <div className="bg-purple-900/30 p-4 rounded-lg">
          <div className="flex justify-between mb-2">
            <span>Your peak volume:</span>
            <span className="font-bold">{Math.round(playerVolume)}</span>
          </div>

          <div className="flex justify-between mb-4">
            <span>Opponent's peak volume:</span>
            <span className="font-bold">{Math.round(opponentVolume)}</span>
          </div>

          {/* Volume comparison */}
          <div className="flex gap-4 items-end justify-center mb-2">
            <div className="flex flex-col items-center">
              <VolumeBar
                volume={100}
                actualValue={playerVolume}
                height={120}
                width={40}
                orientation="vertical"
                showLabel={false}
              />
              <span className="mt-2">You</span>
            </div>

            <div className="flex flex-col items-center">
              <VolumeBar
                volume={100}
                actualValue={opponentVolume}
                height={120}
                width={40}
                orientation="vertical"
                showLabel={false}
              />
              <span className="mt-2">Opponent</span>
            </div>
          </div>

          <div className="text-sm text-purple-300 mt-2">
            {playerWon
              ? `You out-barked your opponent by ${Math.round(playerVolume - opponentVolume)} points!`
              : `Your opponent out-barked you by ${Math.round(opponentVolume - playerVolume)} points!`}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onPlayAgain}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 rounded-lg text-lg"
        >
          Play Again
        </Button>

        <Button
          onClick={handleShare}
          variant="outline"
          className="border-purple-500 text-purple-200 hover:bg-purple-900/30"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Share Result
        </Button>
      </div>
    </div>
  )
}
