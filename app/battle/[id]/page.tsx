"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import BattleArena from "@/components/game/battle-arena"
import BattleResults from "@/components/game/battle-results"
import Leaderboard from "@/components/game/leaderboard"

export default function BattlePage() {
  const params = useParams()
  const roomId = params.id as string
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
        (payload) => {
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
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading battle...</div>
      </div>
    )

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Battle header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black text-white mb-2" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            ROUND {roundNumber + 1}
          </h1>
        </div>

        {/* Game phase rendering */}
        {gamePhase === "lobby" && <BattleArena roomId={roomId} />}
        {gamePhase === "battle" && <BattleArena roomId={roomId} />}
        {gamePhase === "voting" && <BattleArena roomId={roomId} />}
        {gamePhase === "results" && <BattleResults roomId={roomId} onNext={() => setRoundNumber((r) => r + 1)} />}

        {/* Leaderboard sidebar */}
        <div className="mt-12">
          <Leaderboard roomId={roomId} />
        </div>
      </div>
    </main>
  )
}
