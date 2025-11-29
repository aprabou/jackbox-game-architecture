"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Mic, Loader2, AlertCircle, Home, RotateCcw } from "lucide-react"

interface BattleArenaProps {
  roomId: string
}

interface Model {
  id: string
  name: string
  provider: string
  model_identifier: string
}

interface RapVerse {
  lines: string[]
  currentLineIndex: number
  isComplete: boolean
}

export default function BattleArena({ roomId }: BattleArenaProps) {
  const supabase = createClient()
  const [model1, setModel1] = useState<Model | null>(null)
  const [model2, setModel2] = useState<Model | null>(null)
  const [model1Verse, setModel1Verse] = useState<RapVerse>({ lines: [], currentLineIndex: 0, isComplete: false })
  const [model2Verse, setModel2Verse] = useState<RapVerse>({ lines: [], currentLineIndex: 0, isComplete: false })
  const [battleState, setBattleState] = useState<"idle" | "loading" | "model1" | "model2" | "voting">("idle")
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState<any>(null)

  const startRapBattle = async () => {
    try {
      setError(null)
      setBattleState("loading")
      setModel1Verse({ lines: [], currentLineIndex: 0, isComplete: false })
      setModel2Verse({ lines: [], currentLineIndex: 0, isComplete: false })
      setSelectedWinner(null)

      // Fetch all enabled models
      const { data: models, error: modelsError } = await supabase.from("models").select("*").eq("is_enabled", true)

      if (modelsError) {
        throw new Error(`Failed to fetch models: ${modelsError.message}`)
      }

      if (!models || models.length < 2) {
        const errorMsg = "Not enough models available. Please seed the database with at least 2 models."
        setError(errorMsg)
        console.error(`[RAP BATTLE] ${errorMsg}`)
        setBattleState("idle")
        return
      }

      // Pick 2 random models without replacement
      const shuffled = [...models].sort(() => Math.random() - 0.5)
      const [selectedModel1, selectedModel2] = shuffled.slice(0, 2)

      setModel1(selectedModel1)
      setModel2(selectedModel2)

      console.log(`[RAP BATTLE] ${selectedModel1.name} vs ${selectedModel2.name}`)

      // Create a new round
      const { data: roundData, error: roundError } = await supabase
        .from("rounds")
        .insert({
          room_id: roomId,
          prompt: "RAP BATTLE",
          round_index: 0,
          state: "battle",
        })
        .select()
        .single()

      if (roundError) {
        throw new Error(`Failed to create round: ${roundError.message}`)
      }

      setCurrentRound(roundData)

      // Wait 1 second before model 1 starts
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Model 1 drops their verse
      setBattleState("model1")
      const verse1 = await getRapVerse(selectedModel1, selectedModel2)

      // Store model 1 submission
      await storeSubmission(roundData.id, selectedModel1.id, verse1)

      // Animate model 1's verse line by line
      await animateVerse(verse1, setModel1Verse)

      // Wait 1 second before model 2 starts
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Model 2 drops their verse
      setBattleState("model2")
      const verse2 = await getRapVerse(selectedModel2, selectedModel1)

      // Store model 2 submission
      await storeSubmission(roundData.id, selectedModel2.id, verse2)

      // Animate model 2's verse line by line
      await animateVerse(verse2, setModel2Verse)

      // Time to vote!
      setBattleState("voting")
      await supabase.from("rooms").update({ state: "voting" }).eq("id", roomId)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error"
      setError(errorMsg)
      console.error("[RAP BATTLE] Failed to start battle:", err)
      setBattleState("idle")
    }
  }

  const getRapVerse = async (model: Model, opponent: Model): Promise<string> => {
    const res = await fetch("/api/ai/gateway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modelId: model.id,
        prompt: "Drop your hardest bars. Make it RHYME. 4 lines max. GO!",
        model: model.model_identifier,
        provider: model.provider,
        modelName: model.name,
        opponentName: opponent.name,
        opponentProvider: opponent.provider,
      }),
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`)
    }

    const data = await res.json()
    return data.text || "..."
  }

  const storeSubmission = async (roundId: string, modelId: string, content: string) => {
    try {
      const { data: submission, error: subError } = await supabase
        .from("submissions")
        .insert({
          round_id: roundId,
          model_id: modelId,
          content: content,
          anonymized_id: `submission_${Math.random().toString(36).substring(7)}`,
        })
        .select()
        .single()

      if (subError) {
        console.error("[RAP BATTLE] Submission insert error:", subError)
      }

      return submission
    } catch (err) {
      console.error("[RAP BATTLE] Failed to store submission:", err)
    }
  }

  const animateVerse = async (
    verse: string,
    setVerse: React.Dispatch<React.SetStateAction<RapVerse>>,
  ): Promise<void> => {
    // Split verse into lines
    const lines = verse.split("\n").filter((line) => line.trim().length > 0)

    // Animate each line with delay
    for (let i = 0; i < lines.length; i++) {
      setVerse({
        lines: lines.slice(0, i + 1),
        currentLineIndex: i,
        isComplete: i === lines.length - 1,
      })
      await new Promise((resolve) => setTimeout(resolve, 1200)) // 1.2 seconds per line
    }

    setVerse((prev) => ({ ...prev, isComplete: true }))
  }

  const handleVote = async (modelId: string) => {
    setSelectedWinner(modelId)

    try {
      // Find the corresponding submission
      const { data: submission } = await supabase
        .from("submissions")
        .select("id")
        .eq("round_id", currentRound.id)
        .eq("model_id", modelId)
        .single()

      if (submission) {
        // Cast vote
        await supabase.from("votes").insert({
          submission_id: submission.id,
          voter_session_id: "anonymous",
        })

        // Increment score
        await supabase.from("submissions").update({ score: 1 }).eq("id", submission.id)
      }

      // Don't auto-navigate - let user click "Next Round"
    } catch (err) {
      console.error("[RAP BATTLE] Failed to vote:", err)
    }
  }

  const handleNextRound = () => {
    // Reset state and immediately start a new battle
    setModel1(null)
    setModel2(null)
    setModel1Verse({ lines: [], currentLineIndex: 0, isComplete: false })
    setModel2Verse({ lines: [], currentLineIndex: 0, isComplete: false })
    setSelectedWinner(null)
    setCurrentRound(null)

    // Automatically start the next battle
    startRapBattle()
  }

  const handleGoHome = () => {
    // Navigate to home page
    window.location.href = "/"
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Title */}
      {battleState !== "idle" && (
        <div className="text-center">
          <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
            🎤 AI RAP BATTLE 🎤
          </h1>
          <p className="text-xl text-gray-600 mt-2">
            {model1?.name} vs {model2?.name}
          </p>
        </div>
      )}

      {/* Battle Arena */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Model 1 */}
        {model1 && (
          <Card
            className={`bg-gradient-to-br from-purple-50 to-purple-100 border-2 transition-all ${
              battleState === "model1"
                ? "border-purple-500 shadow-2xl ring-4 ring-purple-300 scale-105"
                : selectedWinner === model1.id
                  ? "border-yellow-400 shadow-2xl ring-4 ring-yellow-300"
                  : "border-purple-200"
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-purple-900">{model1.name}</CardTitle>
                {battleState === "model1" && !model1Verse.isComplete && (
                  <Mic className="w-6 h-6 text-purple-600 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-purple-700">Provider: {model1.provider}</p>
            </CardHeader>
            <CardContent>
              <div className="min-h-48 p-6 bg-white/50 rounded-lg">
                {model1Verse.lines.length === 0 && battleState === "loading" && (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </div>
                )}
                {model1Verse.lines.map((line, idx) => (
                  <p
                    key={idx}
                    className="text-xl font-bold text-gray-800 mb-3 animate-fade-in"
                    style={{ fontFamily: "monospace" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
              {battleState === "voting" && (
                <Button
                  onClick={() => handleVote(model1.id)}
                  className={`w-full mt-4 font-bold py-4 text-lg ${
                    selectedWinner === model1.id
                      ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                  }`}
                  disabled={selectedWinner !== null}
                >
                  {selectedWinner === model1.id ? "🏆 WINNER!" : "Vote for this model"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Model 2 */}
        {model2 && (
          <Card
            className={`bg-gradient-to-br from-pink-50 to-pink-100 border-2 transition-all ${
              battleState === "model2"
                ? "border-pink-500 shadow-2xl ring-4 ring-pink-300 scale-105"
                : selectedWinner === model2.id
                  ? "border-yellow-400 shadow-2xl ring-4 ring-yellow-300"
                  : "border-pink-200"
            }`}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-pink-900">{model2.name}</CardTitle>
                {battleState === "model2" && !model2Verse.isComplete && (
                  <Mic className="w-6 h-6 text-pink-600 animate-pulse" />
                )}
              </div>
              <p className="text-sm text-pink-700">Provider: {model2.provider}</p>
            </CardHeader>
            <CardContent>
              <div className="min-h-48 p-6 bg-white/50 rounded-lg">
                {model2Verse.lines.length === 0 && (battleState === "loading" || battleState === "model1") && (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-pink-600 font-semibold">Waiting...</p>
                  </div>
                )}
                {model2Verse.lines.map((line, idx) => (
                  <p
                    key={idx}
                    className="text-xl font-bold text-gray-800 mb-3 animate-fade-in"
                    style={{ fontFamily: "monospace" }}
                  >
                    {line}
                  </p>
                ))}
              </div>
              {battleState === "voting" && (
                <Button
                  onClick={() => handleVote(model2.id)}
                  className={`w-full mt-4 font-bold py-4 text-lg ${
                    selectedWinner === model2.id
                      ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                      : "bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white"
                  }`}
                  disabled={selectedWinner !== null}
                >
                  {selectedWinner === model2.id ? "🏆 WINNER!" : "Vote for this model"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {/* Home Button - Always visible */}
        <Button
          onClick={handleGoHome}
          variant="outline"
          className="font-bold py-4 px-8 text-lg border-2"
        >
          <Home className="w-5 h-5 mr-2" />
          Home
        </Button>

        {/* Start Battle Button */}
        {battleState === "idle" && !error && (
          <Button
            onClick={startRapBattle}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-black py-8 px-16 text-2xl shadow-2xl"
          >
            <Mic className="w-8 h-8 mr-4" />
            START WATCHING 🔥
          </Button>
        )}

        {/* Try Again Button */}
        {error && battleState === "idle" && (
          <Button
            onClick={startRapBattle}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-8 px-12 text-xl"
          >
            <Mic className="w-6 h-6 mr-3" />
            Try Again
          </Button>
        )}

        {/* Next Round Button - Show after voting */}
        {battleState === "voting" && selectedWinner !== null && (
          <Button
            onClick={handleNextRound}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-black py-6 px-12 text-xl shadow-2xl"
          >
            <RotateCcw className="w-6 h-6 mr-3" />
            NEXT ROUND 🔥
          </Button>
        )}
      </div>
    </div>
  )
}
