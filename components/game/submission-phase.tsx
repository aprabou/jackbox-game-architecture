"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

interface SubmissionPhaseProps {
  roomId: string
  players: any[]
  sessionId: string
}

export default function SubmissionPhase({ roomId, players, sessionId }: SubmissionPhaseProps) {
  const supabase = createClient()
  const [submission, setSubmission] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!submission.trim()) return
    setIsSubmitting(true)

    try {
      const { data: roundData } = await supabase
        .from("rounds")
        .select("id")
        .eq("room_id", roomId)
        .eq("state", "submission")
        .single()

      const { data: playerData } = await supabase
        .from("room_players")
        .select("id")
        .eq("room_id", roomId)
        .eq("session_id", sessionId)
        .single()

      await supabase.from("submissions").insert({
        round_id: roundData.id,
        room_player_id: playerData.id,
        content: submission,
        anonymized_id: `sub_${Math.random().toString(36).substr(2, 9)}`,
      })

      setSubmission("")
      setHasSubmitted(true)
    } catch (err) {
      console.error("Failed to submit:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-3xl">Your Turn!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
            <p className="text-xl font-semibold text-gray-800">
              What is the funniest response to "Why did the AI cross the road?"
            </p>
          </div>

          {!hasSubmitted ? (
            <div className="space-y-4">
              <textarea
                placeholder="Write your creative response..."
                value={submission}
                onChange={(e) => setSubmission(e.target.value)}
                className="w-full h-32 p-4 border-2 border-purple-200 rounded-lg focus:border-purple-500 focus:outline-none text-lg"
              />
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !submission.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-6 text-lg"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          ) : (
            <div className="p-6 bg-green-100 rounded-xl text-center">
              <p className="text-lg font-bold text-green-700">Submitted!</p>
              <p className="text-sm text-green-600 mt-2">Waiting for other players...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
