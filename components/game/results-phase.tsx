"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ResultsPhaseProps {
  roomId: string
  players: any[]
}

export default function ResultsPhase({ roomId, players }: ResultsPhaseProps) {
  const results = [
    { rank: 1, anonymized_id: "happy_fox_123", votes: 12, content: "Because it wanted to byte the other side!" },
    { rank: 2, anonymized_id: "clever_panda_456", votes: 8, content: "To prove it wasn't a chicken." },
    { rank: 3, anonymized_id: "wild_eagle_789", votes: 5, content: "It got tired of recursion loops." },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          ROUND RESULTS
        </h2>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <Card key={result.rank} className="bg-white/95 backdrop-blur">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-black text-purple-600 w-16 text-center">#{result.rank}</div>
                <div>
                  <p className="text-lg font-bold">{result.content}</p>
                  <p className="text-sm text-gray-500">{result.anonymized_id}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-pink-600">{result.votes}</p>
                <p className="text-sm text-gray-500">votes</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg">
        Next Round
      </Button>
    </div>
  )
}
