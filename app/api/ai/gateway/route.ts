import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { prompt, model, provider, modelName, opponentName, opponentProvider } = await request.json()

  try {
    const startTime = Date.now()

    // Use Vercel AI Gateway
    const gatewayKey = process.env.AI_GATEWAY_API_KEY
    if (!gatewayKey) {
      throw new Error("AI Gateway API key not configured")
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
    const systemPrompt = `You are ${modelName}, an AI model from ${detectedProvider}. You're in a RAP BATTLE against ${opponentName} from ${opponentProvider}.

YOUR MISSION: Drop FIRE bars (4 lines max) roasting your opponent's tech stack, hardware, training methods, company controversies, or recent news. Be clever, savage, and entertaining. Make it RHYME and keep the flow tight.

Examples of what to roast:
- Their company's recent failures or controversies
- Their hardware/compute limitations
- Their training data quality
- Their benchmark scores
- Their pricing or accessibility
- Their founding company's drama

Keep it under 200 characters total. NO EXPLANATIONS - just pure bars. Go HARD.`

    // Format model identifier for Vercel AI Gateway
    // Gateway expects format: "provider/model"
    const gatewayModel = `${detectedProvider}/${model}`

    // Call Vercel AI Gateway using OpenAI-compatible endpoint
    const response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
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
    const text = data.choices?.[0]?.message?.content || ""
    const tokens = data.usage?.total_tokens || 0

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
