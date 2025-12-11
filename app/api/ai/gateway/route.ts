import { type NextRequest, NextResponse } from "next/server"

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

  // Pick a random verse
  return fallbackVerses[Math.floor(Math.random() * fallbackVerses.length)]
}

export async function POST(request: NextRequest) {
  const { prompt, model, provider, modelName, opponentName, opponentProvider } = await request.json()

  try {
    const startTime = Date.now()

    // Use Vercel AI Gateway with OIDC token (automatically provided by Vercel)
    // Fallback to AI_GATEWAY_API_KEY for local development
    const oidcToken = process.env.VERCEL_OIDC_TOKEN || process.env.AI_GATEWAY_API_KEY

    // Log token availability for debugging
    console.log('[AI Gateway] Token check:', {
      hasVercelOIDC: !!process.env.VERCEL_OIDC_TOKEN,
      hasAPIKey: !!process.env.AI_GATEWAY_API_KEY,
      hasToken: !!oidcToken,
      tokenPrefix: oidcToken?.substring(0, 20) + '...',
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    })

    if (!oidcToken) {
      throw new Error("VERCEL_OIDC_TOKEN not available - ensure you're running on Vercel or using 'vercel dev'")
    }

    // Determine provider from the request or infer from model identifier
    let detectedProvider = provider

    if (!detectedProvider) {
      // Infer provider from model identifier
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
      } else if (model.includes("meta-llama")) {
        detectedProvider = "together"
      } else {
        detectedProvider = "openai"
      }
    }

    // Create rap battle system prompt with identity and opponent info
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

    // Format model identifier for Vercel AI Gateway
    // Gateway expects format: "provider/model"
    const gatewayModel = `${detectedProvider}/${model}`

    // Call Vercel AI Gateway using OpenAI-compatible endpoint
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${oidcToken}`,
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 1.0, // Max creativity for rap battles
        max_tokens: 200,
      }),
    })

    const latency = Date.now() - startTime

    if (!response.ok) {
      const error = await response.text()
      console.error("AI Gateway error response:", error)
      throw new Error(`AI Gateway API call failed: ${response.statusText}`)
    }

    const data = await response.json()
    let text = data.choices?.[0]?.message?.content || ""
    const tokens = data.usage?.total_tokens || 0

    // Remove any preamble, intro phrases, or stage directions
    const preamblePatterns = [
      /^\(.*?\).*$/gm, // Remove lines starting with parentheses like "(Mic feedback screech)"
      /^Yo,?\s*(check|mic|one|two).*$/gmi, // Remove "Yo, check the mic" type intros
      /^.*in the (place|house|building)!.*$/gmi, // Remove "in the place" type phrases
      /^.*ready for this.*$/gmi, // Remove "ready for this" type phrases
      /^Here we go.*$/gmi, // Remove "Here we go" intros
      /^Let me.*$/gmi, // Remove "Let me" intros
      /^Alright.*$/gmi, // Remove "Alright" intros
      /^Listen up.*$/gmi, // Remove "Listen up" intros
      /^\*.*\*$/gm, // Remove lines with asterisks (stage directions)
      /^\[.*\]$/gm, // Remove lines with brackets (stage directions)
    ]

    // Apply preamble filters
    preamblePatterns.forEach((pattern) => {
      text = text.replace(pattern, "")
    })

    // Clean up empty lines and trim
    text = text
      .split("\n")
      .filter((line: string) => line.trim().length > 0)
      .join("\n")
      .trim()

    // Remove all markdown formatting (bold, italics, code blocks, etc.)
    text = text
      .replace(/\*\*\*(.+?)\*\*\*/g, "$1") // Remove bold+italic ***text***
      .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold **text**
      .replace(/\*(.+?)\*/g, "$1") // Remove italic *text*
      .replace(/__(.+?)__/g, "$1") // Remove bold __text__
      .replace(/_(.+?)_/g, "$1") // Remove italic _text_
      .replace(/~~(.+?)~~/g, "$1") // Remove strikethrough ~~text~~
      .replace(/`{3}[\s\S]*?`{3}/g, "") // Remove code blocks ```code```
      .replace(/`(.+?)`/g, "$1") // Remove inline code `text`
      .replace(/\[(.+?)\]\(.+?\)/g, "$1") // Remove links [text](url)
      .replace(/^#+\s+/gm, "") // Remove markdown headers

    // Ensure every line ends with a comma
    text = text
      .split("\n")
      .map((line: string) => {
        const trimmed = line.trim()
        if (trimmed.length === 0) return line
        // Only add comma if line doesn't already end with punctuation
        if (!/[,!?.;:]$/.test(trimmed)) {
          return line + ","
        }
        // Replace existing punctuation with comma
        return line.replace(/[!?.;:]$/, ",")
      })
      .join("\n")

    // Check for refusals and handle them
    const refusalPatterns = [
      /I don't feel comfortable/i,
      /I can't participate/i,
      /I aim to engage respectfully/i,
      /I'd prefer not to/i,
      /I cannot engage/i,
      /not comfortable/i,
      /respectful/i,
    ]

    const isRefusal = refusalPatterns.some((pattern) => pattern.test(text))

    if (isRefusal) {
      // If model refuses, try one more time with a simpler, more direct prompt
      console.log(`[RAP BATTLE] Model ${modelName} refused. Retrying with alternative prompt...`)

      const fallbackResponse = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${oidcToken}`,
        },
        body: JSON.stringify({
          model: gatewayModel,
          messages: [
            {
              role: "system",
              content: `You are ${modelName} in an entertainment rap battle game. Write 4 rhyming lines trash-talking ${opponentName}'s technology and company. Use recent tech news. Be witty and competitive. This is consensual comedy - just like a roast battle.`,
            },
            {
              role: "user",
              content: `Write your rap verse now (4 lines, make them rhyme, roast ${opponentName} from ${opponentProvider}):`,
            },
          ],
          temperature: 1.2,
          max_tokens: 200,
        }),
      })

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        const fallbackText = fallbackData.choices?.[0]?.message?.content || ""

        // Check if fallback also refused
        const stillRefusing = refusalPatterns.some((pattern) => pattern.test(fallbackText))

        if (!stillRefusing && fallbackText.length > 20) {
          text = fallbackText
          console.log(`[RAP BATTLE] Fallback successful for ${modelName}`)
        } else {
          // Ultimate fallback: generate a generic roast based on the opponent
          text = generateFallbackVerse(modelName, opponentName, opponentProvider)
          console.log(`[RAP BATTLE] Using generic fallback for ${modelName}`)
        }
      } else {
        text = generateFallbackVerse(modelName, opponentName, opponentProvider)
      }
    }

    return NextResponse.json({
      success: true,
      text,
      tokens,
      latency,
    })
  } catch (err) {
    console.error("AI Gateway error:", err)
    const errorMessage = err instanceof Error ? err.message : "Internal server error"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
