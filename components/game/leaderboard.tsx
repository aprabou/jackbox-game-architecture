"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface LeaderboardProps {
  roomId?: string // Optional now
}

export default function Leaderboard({ roomId }: LeaderboardProps) {
  const supabase = createClient()
  const [standings, setStandings] = useState<any[]>([])

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        // Get all models with their total votes
        const { data: models } = await supabase
          .from("models")
          .select("*, submissions(votes(id))")
          .eq("is_enabled", true)

        if (models) {
          const standings = models
            .map((model) => {
              const totalVotes = model.submissions.reduce((sum: number, sub: any) => sum + (sub.votes?.length || 0), 0)
              return { ...model, totalVotes }
            })
            .sort((a, b) => b.totalVotes - a.totalVotes)

          setStandings(standings)
        }
      } catch (err) {
        console.error("[LEADERBOARD] Failed to fetch standings:", err)
      }
    }

    // Initial fetch
    fetchStandings()

    // Subscribe to changes
    const channelName = roomId ? `leaderboard:${roomId}` : "leaderboard:global"
    const subscription = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        fetchStandings()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [roomId, supabase])

  return (
    <Card className="bg-white/95 backdrop-blur border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl">🏆 Model Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No battles yet. Start watching to see the leaderboard!</p>
        ) : (
          <div className="space-y-3">
            {standings.map((model, idx) => (
              <div
                key={model.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                  idx === 0
                    ? "bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400"
                    : idx === 1
                      ? "bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400"
                      : idx === 2
                        ? "bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-400"
                        : "bg-gradient-to-r from-purple-50 to-pink-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`text-3xl font-black ${
                      idx === 0
                        ? "text-yellow-600"
                        : idx === 1
                          ? "text-gray-600"
                          : idx === 2
                            ? "text-orange-600"
                            : "text-purple-600"
                    }`}
                  >
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                  </span>
                  <div>
                    <p className="font-bold text-lg">{model.name}</p>
                    <p className="text-xs text-gray-600">{model.provider}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-pink-600">{model.totalVotes}</p>
                  <p className="text-xs text-gray-500">votes</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
