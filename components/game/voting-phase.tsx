"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface VotingPhaseProps {
  roomId: string
  players: any[]
}

export default function VotingPhase({ roomId, players }: VotingPhaseProps) {
  const submissions = [
    { id: 1, anonymized_id: "happy_fox_123", content: "Because it wanted to byte the other side!" },
    { id: 2, anonymized_id: "clever_panda_456", content: "To prove it wasn't a chicken." },
    { id: 3, anonymized_id: "wild_eagle_789", content: "It got tired of recursion loops." },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-4xl font-black text-white mb-2" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
          TIME TO VOTE
        </h2>
        <p className="text-white/90 text-lg">Pick your favorite response (30s)</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {submissions.map((sub) => (
          <Card
            key={sub.id}
            className="bg-white/95 backdrop-blur hover:shadow-2xl transition-all cursor-pointer transform hover:scale-105"
          >
            <CardHeader>
              <CardTitle className="text-sm text-gray-500">{sub.anonymized_id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-semibold">{sub.content}</p>
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold">
                Vote for This
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
