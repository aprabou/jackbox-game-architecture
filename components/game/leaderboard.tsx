"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface LeaderboardProps {
  roomId?: string // Optional now
}

// Helper function to get logo image based on provider
const getLogoImage = (provider: string) => {
  const providerLower = provider.toLowerCase()

  // Map provider names to logo files
  const logoMap: { [key: string]: string } = {
    anthropic: "/claudelogo.png",
    openai: "/gptlogo.svg",
    google: "/geminilogo.png",
    xai: "/groklogo.png",
    groq: "/metalogo.png",
    meta: "/metalogo.png",
  }

  return logoMap[providerLower] || "/claudelogo.png"
}

// Get model brand colors
const getModelColors = (provider: string) => {
  const providerLower = provider.toLowerCase()

  const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
    anthropic: {
      bg: "bg-[#f4f3ee]",
      text: "text-[#C15F3C]",
      border: "border-[#C15F3C]",
    },
    openai: {
      bg: "bg-[#74AA9C]",
      text: "text-white",
      border: "border-[#74AA9C]",
    },
    google: {
      bg: "bg-[#4A4A4A]",
      text: "text-white",
      border: "border-[#4A4A4A]",
    },
    xai: {
      bg: "bg-black",
      text: "text-white",
      border: "border-black",
    },
    groq: {
      bg: "bg-[#92AEFF]",
      text: "text-black",
      border: "border-[#92AEFF]",
    },
    meta: {
      bg: "bg-white",
      text: "text-[#0081FB]",
      border: "border-[#92AEFF]",
    },
  }

  return (
    colorMap[providerLower] || {
      bg: "bg-gradient-to-br from-purple-50 to-pink-100",
      text: "text-purple-900",
      border: "border-purple-400",
    }
  )
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
    <Card className="bg-black/20 backdrop-blur border-1 shadow-lg">
      <CardHeader>
        <CardTitle className="text-center text-2xl text-white">🏆 Model Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        {standings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No battles yet. Start watching to see the leaderboard!</p>
        ) : (
          <div className="space-y-3">
            {standings.map((model, idx) => {
              const colors = getModelColors(model.provider)
              const isTop3 = idx < 3
              const borderClass = idx === 0
                ? "border-4 border-yellow-400 shadow-xl shadow-yellow-200"
                : idx === 1
                  ? "border-4 border-gray-400 shadow-xl shadow-gray-200"
                  : idx === 2
                    ? "border-4 border-orange-400 shadow-xl shadow-orange-200"
                    : `border-2 ${colors.border}`

              return (
                <div
                  key={model.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${colors.bg} ${borderClass} ${
                    isTop3 ? "scale-105" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`text-3xl font-black ${
                        idx === 0
                          ? "text-yellow-600 drop-shadow-md"
                          : idx === 1
                            ? "text-gray-600 drop-shadow-md"
                            : idx === 2
                              ? "text-orange-600 drop-shadow-md"
                              : colors.text
                      }`}
                    >
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                    </span>
                    <img
                      src={getLogoImage(model.provider)}
                      alt={model.name}
                      className={`object-contain ${isTop3 ? "w-20 h-20" : "w-16 h-16"} ${
                        model.provider.toLowerCase() === "xai" || model.provider.toLowerCase() === "openai" ? "brightness-0 invert" : ""
                      }`}
                    />
                    <div>
                      <p className={`font-bold ${isTop3 ? "text-xl" : "text-lg"} ${colors.text}`}>{model.name}</p>
                      <p className={`text-xs ${colors.text} opacity-70`}>{model.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black ${isTop3 ? "text-3xl" : "text-2xl"} ${colors.text}`}>
                      {model.totalVotes}
                    </p>
                    <p className={`text-xs ${colors.text} opacity-70`}>votes</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
