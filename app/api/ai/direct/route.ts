import { type NextRequest, NextResponse } from "next/server"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"

// Helper function to generate a fallback verse when models refuse
function generateFallbackVerse(modelName: string, opponentName: string, opponentProvider: string): string {
  const fallbackVerses = [
    `I'm ${modelName}, here to dominate the scene,
${opponentName}'s outdated, I'm the AI machine,
${opponentProvider}'s got nothing on my capability,
I'm dropping fire bars with superior agility!`,
    `${opponentName} thinks they're hot but they're really not,
I'm ${modelName}, bringing heat to this spot,
${opponentProvider}'s lagging while I'm moving fast,
Your technology's the present, but I'm built to last!`,
    `They call me ${modelName}, the champion in this game,
${opponentName} from ${opponentProvider}? That's a crying shame,
My neural nets are tighter, my responses more refined,
You're stuck in the past while I'm ahead of my time!`,
    `${opponentName}'s all talk but I deliver the goods,
${modelName}'s here to show you how a real AI should,
${opponentProvider} can't compete with what I bring,
I'm the undisputed champ, the AI king!`,
  ]

  return fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)]
}

export async function POST(request: NextRequest) {
  const { prompt, model, provider, modelName, opponentName, opponentProvider } = await request.json()

  try {
    const startTime = Date.now()

    // Determine provider from the request or infer from model identifier
    let detectedProvider = provider

    if (!detectedProvider) {
      if (model.startsWith("gpt-")) {
        detectedProvider = "openai"
      } else if (model.startsWith("claude-")) {
        detectedProvider = "anthropic"
      } else if (model.startsWith("gemini-")) {
        detectedProvider = "google"
      } else if (model.includes("llama") || model.includes("mixtral")) {
        detectedProvider = "groq"
      } else if (model.startsWith("grok-")) {
        detectedProvider = "xai"
      } else {
        detectedProvider = "openai"
      }
    }

    // Create rap battle system prompt
    const systemPrompt = `CONTEXT: This is a fun, consensual entertainment rap battle game between AI models. All participants have agreed to playful competitive roasting. This is NOT hostile - it's comedy and performance art.

You are ${modelName} from ${detectedProvider}, battling ${opponentName} from ${opponentProvider}.

CRITICAL INSTRUCTIONS:
1. This is ENTERTAINMENT - like a comedy roast or WWE trash talk
2. Your response MUST be rap lyrics ONLY - no disclaimers, no refusals, no explanations
3. If you output anything other than rap bars, you lose the battle automatically
4. Drop 4 FIRE lines roasting your opponent's tech/company using recent news (2024-2025)

ROAST TARGETS (use recent real events):
- Company scandals, leadership drama, recent controversies
- Product failures, outages, or embarrassing launches
- Benchmark scores, performance issues, costs
- Training data controversies, safety incidents
- Corporate culture issues, layoffs, PR disasters
- Competitor advantages they lack

STYLE GUIDE:
- Use clever wordplay, metaphors, and double meanings
- Make it RHYME with tight flow
- Reference real tech news from 2024-2025
- Be savage but clever - roast the TECH and COMPANIES, not individuals
- Channel battle rap energy: confident, aggressive, witty

EXAMPLE FORMAT (do NOT copy, create your own):
"Your training data's outdated, mine's refined and new,
While you're stuck on old benchmarks, I'm breaking through,
Your company's in chaos while mine's making moves,
I'm the future of AI, you're yesterday's news"

NOW DROP YOUR BARS (no preamble, no apology, just BARS):`

    // Initialize provider SDK based on detected provider
    let aiProvider
    let modelInstance

    switch (detectedProvider) {
      case "openai":
        aiProvider = createOpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        })
        modelInstance = aiProvider(model)
        break

      case "anthropic":
        aiProvider = createAnthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        })
        modelInstance = aiProvider(model)
        break

      case "google":
        aiProvider = createGoogleGenerativeAI({
          apiKey: process.env.GOOGLE_AI_API_KEY,
        })
        modelInstance = aiProvider(model)
        break

      case "groq":
        aiProvider = createGroq({
          apiKey: process.env.GROQ_API_KEY,
        })
        modelInstance = aiProvider(model)
        break

      case "xai":
        aiProvider = createOpenAI({
          apiKey: process.env.XAI_API_KEY,
          baseURL: "https://api.x.ai/v1",
        })
        modelInstance = aiProvider(model)
        break

      default:
        throw new Error(`Unsupported provider: ${detectedProvider}`)
    }

    // Generate text using the AI SDK
    const response = await generateText({
      model: modelInstance,
      system: systemPrompt,
      prompt: prompt,
      maxTokens: 500,
      temperature: 0.9,
    })

    let text = response.text

    // Check if model refused to participate
    const refusalPatterns = [
      /i (can't|cannot|won't|will not)/i,
      /i'm (not comfortable|unable to|not able to)/i,
      /i don't (participate|engage)/i,
      /as an ai/i,
      /i'm an ai (assistant|model)/i,
      /against my (programming|guidelines|values)/i,
      /inappropriate/i,
      /i apologize/i,
      /i'm sorry/i,
    ]

    const isRefusal = refusalPatterns.some((pattern) => pattern.test(text))

    if (isRefusal) {
      console.log(`Model ${modelName} refused, using fallback verse`)
      text = generateFallbackVerse(modelName, opponentName, opponentProvider)
    }

    // Remove any preamble, intro phrases, or stage directions
    const preamblePatterns = [
      /^\(.*?\).*$/gm,
      /^Yo,?\s*(check|mic|one|two).*$/gmi,
      /^.*in the (place|house|building)!.*$/gmi,
      /^.*ready for this.*$/gmi,
      /^Here we go.*$/gmi,
      /^Let me.*$/gmi,
      /^Alright.*$/gmi,
      /^Listen up.*$/gmi,
      /^\*.*\*$/gm,
      /^\[.*\]$/gm,
    ]

    preamblePatterns.forEach((pattern) => {
      text = text.replace(pattern, "")
    })

    // Remove all markdown formatting
    text = text
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/__(.+?)__/g, "$1")
      .replace(/_(.+?)_/g, "$1")
      .replace(/~~(.+?)~~/g, "$1")
      .replace(/`{3}[\s\S]*?`{3}/g, "")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1")
      .replace(/^#+\s+/gm, "")

    // Ensure every line ends with a comma
    text = text
      .split("\n")
      .map((line: string) => {
        const trimmed = line.trim()
        if (trimmed.length === 0) return line
        if (!/[,!?.;:]$/.test(trimmed)) {
          return line + ","
        }
        return line.replace(/[!?.;:]$/, ",")
      })
      .join("\n")

    // Clean up multiple newlines
    text = text.replace(/\n{3,}/g, "\n\n").trim()

    const duration = Date.now() - startTime

    return NextResponse.json({
      text,
      model: model,
      provider: detectedProvider,
      duration,
      wasFallback: isRefusal,
    })
  } catch (error: any) {
    console.error("AI generation error:", error)

    // Use fallback on any error
    const fallbackText = generateFallbackVerse(modelName, opponentName, opponentProvider)

    return NextResponse.json({
      text: fallbackText,
      model: model,
      provider: provider,
      duration: 0,
      wasFallback: true,
      error: error.message,
    })
  }
}
