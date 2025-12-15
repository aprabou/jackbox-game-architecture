"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Sparkles } from "lucide-react"
import Leaderboard from "@/components/game/leaderboard"
import { Analytics } from "@vercel/analytics/react"

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
          state: "lobby", // Start in lobby, autostart will trigger the battle
          settings: { mode: "ai_battle" },
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/battle/${data.id}?autostart=true`)
    } catch (err) {
      console.error("Failed to start battle:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <main
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          backgroundImage: "url('/welcomebg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Character Images */}
        <div className="absolute left-4 top-1/2 -translate-y-1/3 -translate-x-40 z-10 hidden xl:block">
          <img src="/characters/claude_rap.png" alt="Claude" className="w-196 h-auto" />
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/3 translate-x-40 z-10 hidden xl:block">
          <img src="/characters/gpt_rap.png" alt="GPT" className="w-196 h-auto" />
        </div>

        <div className="max-w-2xl w-full space-y-8 py-8 relative z-10">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <h1 className="header text-6xl font-black text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
                VersusAI
              </h1>
            </div>
            <Link href="/info">
              <p className="subtext text-lg text-white/80 hover:text-white cursor-pointer underline decoration-white/40 hover:decoration-white transition-colors">
                How does this work?
              </p>
            </Link>
          </div>

          <div className="space-y-6">
            {/* Start Watching Card */}
            <Card className="border-0 shadow-2xl bg-transparent">
              <CardHeader>
              </CardHeader>
              <CardContent className="space-y-6">
                <Button
                  onClick={handleStartBattle}
                  disabled={isLoading}
                  className="header w-full bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-xl py-8"
                >
                  {isLoading ? "Starting..." : "LET'S GO!"}
                </Button>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Leaderboard />
          </div>
        </div>
      </main>
      <Analytics />
    </>
  )
}
