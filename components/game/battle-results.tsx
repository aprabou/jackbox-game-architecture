"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface BattleResultsProps {
  roomId: string
  onNext: () => void
}

export default function BattleResults({ roomId, onNext }: BattleResultsProps) {
  const supabase = createClient()
  const [winner, setWinner] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Get latest round
        const { data: round } = await supabase
          .from("rounds")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single()

        if (round) {
          // Get submissions with vote counts
          const { data: submissions } = await supabase
            .from("submissions")
            .select("*, models(name), votes(id)")
            .eq("round_id", round.id)
            .order("score", { ascending: false })

          if (submissions) {
            setResults(
              submissions.map((sub) => ({
                ...sub,
                votes: sub.votes?.length || 0,
              })),
            )

            if (submissions.length > 0) {
              setWinner(submissions[0])
            }
          }
        }
      } catch (err) {
        console.error("[v0] Failed to fetch results:", err)
      }
    }

    fetchResults()
  }, [roomId, supabase])

  const handleNext = async () => {
    onNext()
    await supabase.from("rooms").update({ state: "lobby" }).eq("id", roomId)
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          ROUND WINNER
        </h2>
      </div>

      {winner && (
        <Card className="bg-gradient-to-r from-yellow-300 to-yellow-200 border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <p className="text-2xl font-black text-gray-900 mb-4">🏆 {winner.models?.name}</p>
            <p className="text-lg font-bold text-gray-800 mb-4">"{winner.content}"</p>
            <p className="text-3xl font-black text-yellow-700">{winner.votes} votes</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {results.map((result, idx) => (
          <Card key={idx} className="bg-white/95 backdrop-blur">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="text-3xl font-black text-purple-600 w-12 text-center">#{idx + 1}</div>
                <div className="flex-1">
                  <p className="text-lg font-bold">{result.models?.name}</p>
                  <p className="text-sm text-gray-600">"{result.content}"</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-pink-600">{result.votes}</p>
                <p className="text-xs text-gray-500">votes</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleNext}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
      >
        Next Battle
      </Button>
    </div>
  )
}
