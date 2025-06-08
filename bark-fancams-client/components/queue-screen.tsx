"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"

interface QueueScreenProps {
  onStartGame: () => void
  playersOnline: number
  queuePosition: number
}

export default function QueueScreen({ onStartGame, playersOnline, queuePosition }: QueueScreenProps) {
  const [searching, setSearching] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [matched, setMatched] = useState(false)

  useEffect(() => {
    if (searching) {
      // Simulate queue countdown
      const timer = setTimeout(() => {
        if (queuePosition > 1) {
          setCountdown(countdown - 1)
        } else {
          setMatched(true)
          // After match found, start game
          setTimeout(() => {
            onStartGame()
          }, 2000)
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [searching, countdown, queuePosition, onStartGame])

  const handleFindMatch = () => {
    setSearching(true)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="mb-8">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-purple-800/50 mb-2">
          <Users className="w-5 h-5 mr-2 text-pink-400" />
          <span className="text-pink-200">{playersOnline} players online</span>
        </div>

        <h2 className="text-4xl font-bold mb-2">Ready to Bark?</h2>
        <p className="text-purple-200 mb-8">Find an opponent and show off your barking skills!</p>
      </div>

      {!searching ? (
        <Button
          onClick={handleFindMatch}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-8 rounded-full text-xl transition-all transform hover:scale-105"
        >
          Find Match
        </Button>
      ) : matched ? (
        <div className="animate-pulse">
          <h3 className="text-2xl font-bold text-green-400 mb-2">Opponent Found!</h3>
          <p className="text-purple-200">Preparing battle...</p>
        </div>
      ) : (
        <div>
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <h3 className="text-xl font-bold mb-2">Searching for opponent...</h3>
          <p className="text-purple-200">Queue position: {queuePosition}</p>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-sm text-purple-300 mt-8">Get ready to bark at your favorite Chaewon fancam!</p>
      </div>
    </div>
  )
}
