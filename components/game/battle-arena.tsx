"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { Loader2, AlertCircle, Home, RotateCcw } from "lucide-react"

interface BattleArenaProps {
  roomId: string
  autostart?: boolean
  onNextRound?: () => void
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

export default function BattleArena({ roomId, autostart = false, onNextRound }: BattleArenaProps) {
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
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-start battle when autostart prop is true
  useEffect(() => {
    if (autostart && !hasAutoStartedRef.current && battleState === "idle") {
      hasAutoStartedRef.current = true
      startRapBattle()
    }
  }, [autostart, battleState])

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio("/track1.mp3")
    audioRef.current.loop = true
    audioRef.current.volume = 0.3 // 30% volume so it doesn't overpower the voice

    // Preload the audio to reduce gaps
    audioRef.current.preload = "auto"

    // Use the 'ended' event to create seamless loop by restarting immediately
    audioRef.current.addEventListener('ended', () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(err => console.log("Loop restart failed:", err))
      }
    })

    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Play/stop music based on battle state
  useEffect(() => {
    if (!audioRef.current) return

    if (battleState === "model1" || battleState === "model2") {
      // Start playing when a model is rapping
      audioRef.current.play().catch((err) => {
        console.log("Audio play failed:", err)
      })
    } else {
      // Stop when not rapping (loading, voting, idle)
      audioRef.current.pause()
      audioRef.current.currentTime = 0 // Reset to beginning
    }
  }, [battleState])

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

      // Animate model 1's verse line by line with voice 0
      await animateVerse(verse1, setModel1Verse, 0)

      // Wait 1 second before model 2 starts
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Model 2 drops their verse
      setBattleState("model2")
      const verse2 = await getRapVerse(selectedModel2, selectedModel1)

      // Store model 2 submission
      await storeSubmission(roundData.id, selectedModel2.id, verse2)

      // Animate model 2's verse line by line with voice 1
      await animateVerse(verse2, setModel2Verse, 1)

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
        prompt: "You are in a RAP BATTLE. Drop your hardest bars. Make it RHYME. I want your bars ONLY. 4 lines max. GO!",
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

  const speakText = (text: string, voiceIndex: number = 0): void => {
    // Check if speech synthesis is available
    if (!window.speechSynthesis) {
      return
    }

    // Fix pronunciation issues by replacing problematic text
    let spokenText = text
      // Fix "GPT-4o" to be pronounced correctly
      .replace(/GPT-4o/gi, "G P T 4 oh")
      .replace(/GPT-4/gi, "G P T 4")
      .replace(/GPT/gi, "G P T")
      // Fix "xAI" or "XAI" to be pronounced as "X A I"
      .replace(/\bxAI\b/gi, "X A I")
      .replace(/\bXAI\b/gi, "X A I")
      // Fix other common model name pronunciation issues
      .replace(/Claude/gi, "Clawed")
      .replace(/Gemini/gi, "Gem In Eye")
      .replace(/Llama/gi, "Llama")
      .replace(/Grok/gi, "Grock")

    const utterance = new SpeechSynthesisUtterance(spokenText)

    // Set voice properties for faster rap-style delivery
    utterance.rate = 1.2 // Much faster for rap flow
    utterance.pitch = 1.0
    utterance.volume = 1.0

    // Try to get available voices and pick one based on index
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      // Try to pick different voices for variety
      const voicesList = voices.filter(voice => voice.lang.startsWith('en'))
      if (voicesList.length > 0) {
        utterance.voice = voicesList[voiceIndex % voicesList.length]
      }
    }

    window.speechSynthesis.speak(utterance)
  }

  const animateVerse = async (
    verse: string,
    setVerse: React.Dispatch<React.SetStateAction<RapVerse>>,
    voiceIndex: number = 0,
  ): Promise<void> => {
    // BPM timing calculations
    const BPM = 50
    const beatsPerBar = 4
    const msPerBeat = (60 / BPM) * 1000 // 1200ms per beat at 50 BPM
    const msPerBar = msPerBeat * beatsPerBar // 4800ms per bar

    // Split verse into lines
    const lines = verse.split("\n").filter((line) => line.trim().length > 0)

    // Start speaking the entire verse at once
    speakText(verse, voiceIndex)

    // Record start time for beat sync
    const startTime = Date.now()

    // Typing animation: show each character one by one
    let currentLineIndex = 0
    let currentText = ""

    for (const line of lines) {
      for (let charIndex = 0; charIndex <= line.length; charIndex++) {
        currentText = line.substring(0, charIndex)

        // Build the lines array with completed lines + current typing line
        const displayLines = [
          ...lines.slice(0, currentLineIndex),
          currentText
        ]

        setVerse({
          lines: displayLines,
          currentLineIndex: currentLineIndex,
          isComplete: false,
        })

        // Typing speed: 30ms per character
        await new Promise((resolve) => setTimeout(resolve, 30))
      }

      currentLineIndex++

      // Longer pause between lines (1 second = 1000ms)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    // Calculate how long the verse took
    const verseEndTime = Date.now()
    const verseDuration = verseEndTime - startTime

    // Calculate how many bars this verse should take (round up to nearest bar)
    // Each line is roughly 1 bar, but we'll round up total duration to nearest bar
    const barsNeeded = Math.ceil(verseDuration / msPerBar)
    const totalTimeNeeded = barsNeeded * msPerBar

    // Add pause to align with the beat
    const pauseNeeded = totalTimeNeeded - verseDuration

    if (pauseNeeded > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseNeeded))
    }

    setVerse({
      lines: lines,
      currentLineIndex: lines.length - 1,
      isComplete: true,
    })
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

    // Notify parent component of round change (for background rotation)
    onNextRound?.()

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
    <div className="space-y-8 max-w-7xl mx-auto px-4 pb-8">
      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200 relative z-20">
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
        <div className="relative z-20">
          {/* Verses Section - Only show during battle, not voting */}
          {battleState !== "voting" && (
            <div className="w-full mb-8">
              {/* Model 1 (left character) - lyrics on the right */}
              {(battleState === "loading" || battleState === "model1") && model1 && (
                <div className="flex justify-end pr-4 md:pr-8 lg:pr-16">
                  <div className="flex flex-col items-start space-y-4 max-w-2xl w-full md:w-2/3 lg:w-1/2">
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
                </div>
              )}

              {/* Model 2 (right character) - lyrics on the left */}
              {battleState === "model2" && model2 && (
                <div className="flex justify-start pl-4 md:pl-8 lg:pl-16">
                  <div className="flex flex-col items-start space-y-4 max-w-2xl w-full md:w-2/3 lg:w-1/2">
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
                </div>
              )}
            </div>
          )}

          {/* Character Images - Bottom Edges */}
          {model1 && (
            <div className="fixed left-2 sm:left-4 md:left-8 bottom-0 z-10">
              <div className="relative">
                <img
                  src={getCharacterImage(model1.provider, battleState === "model1")}
                  alt={model1.name}
                  className={`h-auto transition-all duration-500 ${
                    battleState === "loading" || battleState === "model1"
                      ? "w-24 sm:w-32 md:w-40 lg:w-146 drop-shadow-2xl"
                      : battleState === "model2"
                        ? "w-16 sm:w-20 md:w-32 lg:w-64"
                        : battleState === "voting"
                          ? "w-48 sm:w-64 md:w-80 lg:w-[36rem] xl:w-[42rem] drop-shadow-2xl"
                          : "w-20 sm:w-24 md:w-32 lg:w-120"
                  }`}
                />
              </div>
            </div>
          )}

          {model2 && (
            <div className="fixed right-2 sm:right-4 md:right-8 bottom-0 z-10">
              <div className="relative">
                <img
                  src={getCharacterImage(model2.provider, battleState === "model2")}
                  alt={model2.name}
                  className={`h-auto transition-all duration-500 ${
                    battleState === "model2"
                      ? "w-24 sm:w-32 md:w-40 lg:w-146 drop-shadow-2xl"
                      : battleState === "loading" || battleState === "model1"
                        ? "w-16 sm:w-20 md:w-32 lg:w-64"
                        : battleState === "voting"
                          ? "w-48 sm:w-64 md:w-80 lg:w-[36rem] xl:w-[42rem] drop-shadow-2xl"
                          : "w-20 sm:w-24 md:w-32 lg:w-120"
                  }`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voting Section */}
      {battleState === "voting" && (
        <div className="flex flex-col items-center space-y-6 mt-12 relative z-20">
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
      <div className="flex justify-center gap-4 relative z-20">
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
            START WATCHING 🔥
          </Button>
        )}

        {/* Try Again Button */}
        {error && battleState === "idle" && (
          <Button
            onClick={startRapBattle}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-8 px-12 text-xl"
          >
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
