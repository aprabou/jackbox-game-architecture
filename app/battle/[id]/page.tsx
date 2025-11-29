"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import BattleArena from "@/components/game/battle-arena"
import BattleResults from "@/components/game/battle-results"
import Leaderboard from "@/components/game/leaderboard"

export default function BattlePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const roomId = params.id as string
  const autostart = searchParams.get("autostart") === "true"
  const supabase = createClient()

  const [battle, setBattle] = useState<any>(null)
  const [gamePhase, setGamePhase] = useState("lobby") // lobby, battle, voting, results, finished
  const [roundNumber, setRoundNumber] = useState(0)

  useEffect(() => {
    const fetchBattle = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single()

      if (data) {
        setBattle(data)
        setGamePhase(data.state)
      }
    }

    // Subscribe to battle changes
    const subscription = supabase
      .channel(`battle:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload: any) => {
          setBattle(payload.new)
          setGamePhase(payload.new.state)
        },
      )
      .subscribe()

    fetchBattle()
    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, supabase])

  if (!battle)
    return (
      <div
        className="min-h-screen flex items-center justify-center relative"
        style={{
          backgroundImage: "url('/welcomebg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="text-white text-2xl font-bold relative z-10">Loading battle...</div>
      </div>
    )

  return (
    <main
      className="min-h-screen p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/googlebg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Battle header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-white mb-2" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            VerseAI
          </h1>
        </div>

        {/* Game phase rendering */}
        {gamePhase === "lobby" && <BattleArena roomId={roomId} autostart={autostart} />}
        {gamePhase === "battle" && <BattleArena roomId={roomId} autostart={false} />}
        {gamePhase === "voting" && <BattleArena roomId={roomId} autostart={false} />}
        {gamePhase === "results" && <BattleResults roomId={roomId} onNext={() => setRoundNumber((r) => r + 1)} />}
      </div>
    </main>
  )
}
