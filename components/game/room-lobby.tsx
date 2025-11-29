"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface RoomLobbyProps {
  roomId: string
  players: any[]
  isHost: boolean
}

export default function RoomLobby({ roomId, players, isHost }: RoomLobbyProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isStarting, setIsStarting] = useState(false)

  const handleStartGame = async () => {
    setIsStarting(true)
    try {
      // Update room state to 'submission'
      await supabase.from("rooms").update({ state: "submission" }).eq("id", roomId)

      // Create first round
      const { data: roundData } = await supabase
        .from("rounds")
        .insert({
          room_id: roomId,
          prompt: 'What is the funniest response to "Why did the AI cross the road?"',
          round_index: 0,
          state: "submission",
        })
        .select()
        .single()

      // Call models to generate responses
      await fetch("/api/orchestrate/run-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId: roundData?.id, roomId }),
      })
    } catch (err) {
      console.error("Failed to start game:", err)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Players ({players.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg"
                >
                  <span className="font-semibold text-lg">{player.display_name}</span>
                  <span className="text-sm text-gray-500 font-mono">{player.role}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Ready?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">Waiting for host to start the game...</p>
            {isHost && (
              <Button
                onClick={handleStartGame}
                disabled={isStarting || players.length < 1}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
              >
                {isStarting ? "Starting..." : "Start Game"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
