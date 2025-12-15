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
    nvidia: "/nvidialogo.svg"
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
      border: "border-white",
    },
    meta: {
      bg: "bg-white",
      text: "text-[#0081FB]",
      border: "border-[#92AEFF]",
    },
    nvidia: {
      bg: "bg-[#000000]",
      text: "text-[#ffffff]",
      border: "border-[#76B900]"
    }
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
        <CardTitle className="subtext text-center text-2xl text-white">Model Leaderboard</CardTitle>
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
                  <div className="header flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center ${isTop3 ? "w-16 h-16 text-2xl" : "w-12 h-12 text-xl"} font-black rounded-full ${
                        idx === 0
                          ? "bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 text-yellow-900 shadow-lg shadow-yellow-500/50 ring-4 ring-yellow-400/30"
                          : idx === 1
                            ? "bg-gradient-to-br from-gray-200 via-gray-300 to-gray-500 text-gray-800 shadow-lg shadow-gray-400/50 ring-4 ring-gray-300/30"
                            : idx === 2
                              ? "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-orange-900 shadow-lg shadow-orange-500/50 ring-4 ring-orange-400/30"
                              : `${colors.bg} ${colors.text} border-2 ${colors.border}`
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <img
                      src={getLogoImage(model.provider)}
                      alt={model.name}
                      className={`object-contain ${isTop3 ? "w-20 h-20" : "w-16 h-16"} ${
                        model.provider.toLowerCase() === "xai" || model.provider.toLowerCase() === "openai" ? "brightness-0 invert" : ""
                      }`}
                    />
                    <div>
                      <p className={`font-bold ${isTop3 ? "text-xl" : "text-lg"} ${colors.text}`}>{model.name}</p>
                      <p className={`subtext text-xs ${colors.text} opacity-70`}>{model.provider}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`subtext font-black ${isTop3 ? "text-3xl" : "text-2xl"} ${colors.text}`}>
                      {model.totalVotes}
                    </p>
                    <p className={`subtext text-xs ${colors.text} opacity-70`}>votes</p>
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
