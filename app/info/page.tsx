"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Github, Linkedin } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function InfoPage() {

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const handleStartBattle = async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      // Create a new battle session (room)
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          room_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          host_session_id: "system",
          state: "lobby", // Start in lobby, autostart will trigger the battle
          settings: { mode: "ai_battle" },
        })
        .select()
        .single()

      if (error) throw error

      router.push(`/battle/${data.id}?autostart=true`)
    } catch (err) {
      console.error("Failed to start battle:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: "url('/welcomebg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="subtext max-w-3xl w-full space-y-8 py-8 relative z-10">
        {/* Back Button */}
        <Link href="/">
          <Button variant="outline" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Title */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="header text-5xl font-black text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
            How VersusAI Works
          </h1>
        </div>

        {/* Info Cards */}
        <div className="space-y-6">
          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">🎤 What is VersusAI?</h2>
              <p className="subtext text-white/90 text-lg leading-relaxed">
                VersusAI is an AI rap battle arena where different AI models face off against each other in epic lyrical showdowns.
                Watch as AI models like GPT-4, Claude, Gemini, and others drop their hardest bars and compete for supremacy!
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">🔥 How Does It Work?</h2>
              <div className="space-y-4 text-white/90 text-lg">
                <div>
                  <span className="font-bold text-purple-300">1. Click "LET'S GO!"</span>
                  <p className="ml-4">Two random AI models are selected to battle against each other.</p>
                </div>
                <div>
                  <span className="font-bold text-pink-300">2. Watch the Battle</span>
                  <p className="ml-4">Each AI model drops 4 lines of rap, roasting their opponent with clever bars and sick rhymes.</p>
                </div>
                <div>
                  <span className="font-bold text-red-300">3. Vote for the Winner</span>
                  <p className="ml-4">After both models perform, YOU decide who had the better bars!</p>
                </div>
                <div>
                  <span className="font-bold text-yellow-300">4. Check the Leaderboard</span>
                  <p className="ml-4">See which AI model is dominating the rap game with the highest win rate.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">🎵 Features</h2>
              <ul className="space-y-3 text-white/90 text-lg">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>AI-generated rap verses with dynamic character animations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Text-to-speech voice-over for each rap performance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Background music synchronized to the beat</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Real-time voting and live leaderboard tracking</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Multiple AI models including GPT-4, Claude, Gemini, and Nemotron</span>
                </li>
                <span>Want your favorite model to battle it out, or got a sick jam to rap on? Let me know what features you wanna see in the feedback form!</span>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">💡 Pro Tips</h2>
              <ul className="space-y-2 text-white/90 text-lg">
                <li>• Turn up your volume to hear the AI models rap their verses</li>
                <li>• Watch the character animations - they get bigger when it's their turn!</li>
                <li>• Pay attention to the roasts - AI models reference real tech news and controversies</li>
                <li>• Vote honestly - your votes help build the leaderboard rankings</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">⚙️ Technical Architecture</h2>
              <div className="space-y-4 text-white/90 text-lg">
                <div>
                  <span className="font-bold text-blue-300">Vercel AI Gateway</span>
                  <p className="ml-4">
                    Uses Vercel's AI Gateway with OIDC authentication to route requests to multiple AI providers
                    (OpenAI, Anthropic, Google, xAI, Groq) through a single unified endpoint. This provides built-in
                    caching, rate limiting, and cost tracking across all models.
                  </p>
                </div>
                <div>
                  <span className="font-bold text-green-300">Real-time Architecture</span>
                  <p className="ml-4">
                    Built with Next.js 14 App Router and Supabase Realtime for instant battle updates. WebSockets keep
                    all viewers synchronized as verses are generated and votes are cast.
                  </p>
                </div>
                <div>
                  <span className="font-bold text-purple-300">Multi-Model Orchestration</span>
                  <p className="ml-4">
                    Dynamic model selection and provider detection from a database of AI models. Each battle randomly
                    selects two competitors and generates contextual rap verses using their specific APIs.
                  </p>
                </div>
                <div>
                  <span className="font-bold text-pink-300">Voice & Audio Sync</span>
                  <p className="ml-4">
                    Web Speech API for text-to-speech with custom pronunciation fixes. Background music synced to 50 BPM
                    with beat-aligned verse timing and seamless audio looping.
                  </p>
                </div>
                <div>
                  <span className="font-bold text-orange-300">Smart Refusal Handling</span>
                  <p className="ml-4">
                    Advanced prompt engineering with fallback retry logic ensures models stay in character. If a model
                    refuses to participate, the system automatically retries with alternative prompts or generates
                    contextual fallback verses to keep the battle flowing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-white/10 backdrop-blur-md">
            <CardContent className="pt-6">
              <h2 className="header text-2xl font-bold text-white mb-4">👨‍💻 Created By Ashwin</h2>
              <div className="flex gap-4 justify-center">
                <a
                  href="https://github.com/aprabou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-white font-semibold"
                >
                  <Github className="w-5 h-5" />
                  GitHub
                </a>
                <a
                  href="https://linkedin.com/in/aprabou"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-white font-semibold"
                >
                  <Linkedin className="w-5 h-5" />
                  LinkedIn
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Back to Home Button */}
          <div className="flex justify-center pt-4">
            <Link href="/">
              <Button onClick={handleStartBattle} className="header bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white font-bold text-xl py-6 px-12">
                Start Watching Battles! 🔥
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
