"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Sparkles } from "lucide-react"
import Leaderboard from "@/components/game/leaderboard"

export default function Home() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleStartBattle = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create a new battle session (room)
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          room_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          host_session_id: "system",
          state: "lobby",
          settings: { mode: "ai_battle" },
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/battle/${data.id}`)
    } catch (err) {
      console.error("Failed to start battle:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
      <div className="max-w-5xl w-full space-y-8 py-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-12 h-12 text-white" />
            <h1 className="text-6xl font-black text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
              AI RAP BATTLE
            </h1>
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          <p className="text-2xl text-white/90 font-bold">🎤 Watch AI Models Battle It Out 🎤</p>
          <p className="text-lg text-white/80">Who drops the hardest bars? You decide!</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Start Watching Card */}
          <Card className="bg-white/95 backdrop-blur border-0 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Ready to Watch?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-center text-gray-700">
                <p className="font-semibold">What happens next:</p>
                <ul className="text-sm space-y-1">
                  <li>🎤 Two AI models face off in a rap battle</li>
                  <li>🔥 They drop bars roasting each other</li>
                  <li>🗳️ You vote for the best rapper</li>
                  <li>🏆 Watch the leaderboard evolve</li>
                </ul>
              </div>

              <Button
                onClick={handleStartBattle}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-xl py-8"
              >
                {isLoading ? "Starting..." : "START WATCHING 🔥"}
              </Button>

              <p className="text-xs text-gray-500 text-center">No sign-up needed. Just watch and vote.</p>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Leaderboard />
        </div>
      </div>
    </main>
  )
}
