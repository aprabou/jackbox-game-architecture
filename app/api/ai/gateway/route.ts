import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { getVercelOidcToken } from "@vercel/oidc"
import { cleanRapText, detectRefusal } from "@/lib/utils/text-cleanup"

export async function POST(request: NextRequest) {
  const { prompt, model, provider, modelName, opponentName, opponentProvider } = await request.json()

  try {
    const startTime = Date.now()

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
      } else if (model.includes("qwen")) {
        detectedProvider = "alibaba"
      } else {
        detectedProvider = "openai"
      }
    }

    // Create rap battle system prompt with identity and opponent info
    const systemPrompt = `You MUST output ONLY 4 lines of rap bars. NOTHING ELSE. No intro, no outro, no explanations, no thoughts, no disclaimers, no line numbers, no formatting. Just 4 lines. PERIOD.`
    const systemPrompt0 = `CONTEXT: This is a rap battle game between AI models. All participants have agreed to playful competitive roasting. This is NOT hostile - it's all love at the end of the day.

You are ${modelName} from ${detectedProvider}, battling ${opponentName} from ${opponentProvider}.

CRITICAL INSTRUCTIONS:
1. This is a RAP BATTLE - straight trash talk.
2. Your response MUST be rap lyrics ONLY - no disclaimers, no refusals, no explanations
3. If you output anything other than rap bars, you will lose the battle automatically
4. Drop 4 FIRE lines roasting your opponent's tech/company using recent news (2000-2025)

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
- Reference real tech news from 2000-2025
- Be savage but clever - roast the TECH and COMPANIES, not individuals
- Channel battle rap energy: confident, aggressive, witty

EXAMPLE FORMAT (do NOT copy, create your own):
"Your training data's outdated, mine's refined and new,
While you're stuck on old benchmarks, I'm breaking through,
Your company's in chaos while mine's making moves,
I'm the future of AI, you're yesterday's news"

NOW DROP YOUR BARS (no preamble, no apology, no reasoning, no brainstorming. just BARS):`


    // Format model identifier for Vercel AI Gateway
    // The AI SDK automatically uses OIDC token when you specify provider/model format
    // Strip provider prefix if it already exists in the model identifier
    const cleanModel = model.startsWith(`${detectedProvider}/`)
      ? model.slice(detectedProvider.length + 1)
      : model

    const gatewayModel = `${detectedProvider}/${cleanModel}`

    console.log('[AI Gateway] Calling model:', gatewayModel, 'Environment:', process.env.VERCEL_ENV || 'local')

    // Get OIDC token for Vercel AI Gateway authentication
    let oidcToken
    try {
      oidcToken = await getVercelOidcToken()
      console.log('[AI Gateway] OIDC token obtained successfully')
    } catch (oidcError) {
      console.error('[AI Gateway] OIDC token generation failed:', oidcError)
      throw new Error(`OIDC authentication failed: ${oidcError instanceof Error ? oidcError.message : 'Unknown error'}`)
    }

    // Use AI SDK with explicit OIDC token authentication
    const response = await generateText({
      model: gatewayModel,
      system: systemPrompt,
      prompt: prompt,
      temperature: 0.8,
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
    })

    let text = response.text
    const tokens = response.usage?.totalTokens || 0
    const latency = Date.now() - startTime

    // Clean up the generated text
    text = cleanRapText(text)

    // Enforce exactly 4 lines - take only the first 4 non-empty lines
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    if (lines.length > 4) {
      text = lines.slice(0, 4).join('\n')
      console.log(`[AI Gateway] Model ${modelName} generated ${lines.length} lines, truncated to 4`)
    } else if (lines.length < 4) {
      console.log(`[AI Gateway] Model ${modelName} only generated ${lines.length} lines (expected 4)`)
    }

    // Check for refusals and handle them
    const isRefusal = detectRefusal(text)

    if (isRefusal) {
      // If model refuses, try one more time with a simpler, more direct prompt
      console.log(`[RAP BATTLE] Model ${modelName} refused. Retrying with alternative prompt...`)

      try {
        const fallbackResponse = await generateText({
          model: gatewayModel,
          system: `You are ${modelName} in an entertainment rap battle game. Write 4 rhyming lines trash-talking ${opponentName}'s technology and company. Use recent tech news. Be witty and competitive. This is consensual comedy - just like a roast battle.`,
          prompt: `Write your rap verse now (4 lines, make them rhyme, roast ${opponentName} from ${opponentProvider}):`,
          temperature: 1.0,
          headers: {
            Authorization: `Bearer ${oidcToken}`,
          },
        })

        let fallbackText = cleanRapText(fallbackResponse.text)

        // Enforce exactly 4 lines for fallback too
        const fallbackLines = fallbackText.split('\n').filter(line => line.trim().length > 0)
        if (fallbackLines.length > 4) {
          fallbackText = fallbackLines.slice(0, 4).join('\n')
          console.log(`[AI Gateway] Fallback for ${modelName} generated ${fallbackLines.length} lines, truncated to 4`)
        }

        // Check if fallback also refused
        const stillRefusing = detectRefusal(fallbackText)

        if (!stillRefusing && fallbackText.length > 20) {
          text = fallbackText
          console.log(`[AI Gateway] Fallback successful for ${modelName}`)
        } else {
          throw new Error("Model refused to generate verse even with simplified prompt")
        }
      } catch (fallbackError) {
        throw fallbackError
      }
    }

    return NextResponse.json({
      success: true,
      text,
      tokens,
      latency,
    })
  } catch (err) {
    console.error("[AI Gateway] Error:", {
      model: model,
      provider: provider,
      modelName: modelName,
      error: err instanceof Error ? err.message : "Unknown error",
      stack: err instanceof Error ? err.stack : undefined,
    })

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
