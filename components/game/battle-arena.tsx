"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Mic, Loader2, AlertCircle, Home, RotateCcw } from "lucide-react"

interface BattleArenaProps {
  roomId: string
  autostart?: boolean
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

export default function BattleArena({ roomId, autostart = false }: BattleArenaProps) {
  const supabase = createClient()
  const [model1, setModel1] = useState<Model | null>(null)
  const [model2, setModel2] = useState<Model | null>(null)
  const [model1Verse, setModel1Verse] = useState<RapVerse>({ lines: [], currentLineIndex: 0, isComplete: false })
  const [model2Verse, setModel2Verse] = useState<RapVerse>({ lines: [], currentLineIndex: 0, isComplete: false })
  const [battleState, setBattleState] = useState<"idle" | "loading" | "model1" | "model2" | "voting">("idle")
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRound, setCurrentRound] = useState<any>(null)
  const hasAutoStartedRef = useRef(false)

  // Auto-start battle when autostart prop is true
  useEffect(() => {
    if (autostart && !hasAutoStartedRef.current && battleState === "idle") {
      hasAutoStartedRef.current = true
      startRapBattle()
    }
  }, [autostart, battleState])

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
      await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 seconds per line
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

  // Helper function to get character image based on provider
  const getCharacterImage = (provider: string, isRapping: boolean) => {
    const providerLower = provider.toLowerCase()
    const state = isRapping ? "rap" : "idle"

    // Map provider names to character names
    const providerMap: { [key: string]: string } = {
      anthropic: "claude",
      openai: "gpt",
      google: "gemini",
      xai: "grok",
      meta: "llama",
    }

    const characterName = providerMap[providerLower] || "claude"
    return `/characters/${characterName}_${state}.png`
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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

      {/* Battle Arena */}
      {(model1 || model2) && (
        <div className="relative">
          {/* Verses Section - Top */}
          {battleState === "voting" ? (
            // Show both verses side by side during voting
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Model 1 Verses */}
              {model1 && (
                <div className="flex flex-col items-center space-y-4">
                  {/* Model Name */}
                  <h3 className="text-3xl font-black text-white">{model1.name}</h3>

                  {/* Rap Verses */}
                  <div className="w-full min-h-[250px] bg-black/30 backdrop-blur-sm rounded-lg p-6">
                    {model1Verse.lines.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-xl font-bold text-white mb-3"
                        style={{ fontFamily: "monospace", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Model 2 Verses */}
              {model2 && (
                <div className="flex flex-col items-center space-y-4">
                  {/* Model Name */}
                  <h3 className="text-3xl font-black text-white">{model2.name}</h3>

                  {/* Rap Verses */}
                  <div className="w-full min-h-[250px] bg-black/30 backdrop-blur-sm rounded-lg p-6">
                    {model2Verse.lines.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-xl font-bold text-white mb-3"
                        style={{ fontFamily: "monospace", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Show only active model's verses during battle
            <div className="flex justify-center mb-8">
              {(battleState === "loading" || battleState === "model1") && model1 && (
                <div className="flex flex-col items-center space-y-4 max-w-2xl w-full">
                  {/* Model Name */}
                  <h3 className="text-4xl font-black text-white">{model1.name}</h3>

                  {/* Rap Verses */}
                  <div className="w-full min-h-[250px] bg-black/30 backdrop-blur-sm rounded-lg p-6">
                    {model1Verse.lines.length === 0 && battleState === "loading" && (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                    {model1Verse.lines.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-2xl font-bold text-white mb-4 animate-fade-in"
                        style={{ fontFamily: "monospace", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {battleState === "model2" && model2 && (
                <div className="flex flex-col items-center space-y-4 max-w-2xl w-full">
                  {/* Model Name */}
                  <h3 className="text-4xl font-black text-white">{model2.name}</h3>

                  {/* Rap Verses */}
                  <div className="w-full min-h-[250px] bg-black/30 backdrop-blur-sm rounded-lg p-6">
                    {model2Verse.lines.map((line, idx) => (
                      <p
                        key={idx}
                        className="text-2xl font-bold text-white mb-4 animate-fade-in"
                        style={{ fontFamily: "monospace", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Character Images - Bottom Edges */}
          {model1 && (
            <div className="fixed left-8 bottom-0 z-10">
              <div className="relative">
                <img
                  src={getCharacterImage(model1.provider, battleState === "model1")}
                  alt={model1.name}
                  className={`h-auto transition-all duration-500 ${
                    battleState === "loading" || battleState === "model1"
                      ? "w-146 drop-shadow-2xl"
                      : battleState === "model2"
                        ? "w-64"
                        : "w-80"
                  }`}
                />
                {battleState === "model1" && !model1Verse.isComplete && (
                  <div className="absolute top-4 right-4">
                    <Mic className="w-12 h-12 text-purple-600 animate-pulse drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          )}

          {model2 && (
            <div className="fixed right-8 bottom-0 z-10">
              <div className="relative">
                <img
                  src={getCharacterImage(model2.provider, battleState === "model2")}
                  alt={model2.name}
                  className={`h-auto transition-all duration-500 ${
                    battleState === "model2"
                      ? "w-146 drop-shadow-2xl"
                      : battleState === "loading" || battleState === "model1"
                        ? "w-64"
                        : "w-80"
                  }`}
                />
                {battleState === "model2" && !model2Verse.isComplete && (
                  <div className="absolute top-4 left-4">
                    <Mic className="w-12 h-12 text-pink-600 animate-pulse drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voting Section */}
      {battleState === "voting" && (
        <div className="flex flex-col items-center space-y-6 mt-12">
          <h2 className="text-4xl font-black text-white">WHO WON?</h2>
          <div className="flex gap-6">
            {model1 && (
              <Button
                onClick={() => handleVote(model1.id)}
                className={`font-bold py-6 px-12 text-xl ${
                  selectedWinner === model1.id
                    ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                    : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                }`}
                disabled={selectedWinner !== null}
              >
                {selectedWinner === model1.id ? `🏆 ${model1.name} WINS!` : model1.name}
              </Button>
            )}
            {model2 && (
              <Button
                onClick={() => handleVote(model2.id)}
                className={`font-bold py-6 px-12 text-xl ${
                  selectedWinner === model2.id
                    ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                    : "bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white"
                }`}
                disabled={selectedWinner !== null}
              >
                {selectedWinner === model2.id ? `🏆 ${model2.name} WINS!` : model2.name}
              </Button>
            )}
          </div>
        </div>
      )}

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
