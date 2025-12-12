import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const { roundId } = await request.json()
  const supabase = await createClient()

  try {
    // Get round prompt
    const { data: round } = await supabase.from("rounds").select("*").eq("id", roundId).single()

    // Get enabled models
    const { data: models } = await supabase.from("models").select("*").eq("is_enabled", true)

    if (!models || models.length === 0) {
      return NextResponse.json({ error: "No models enabled" }, { status: 400 })
    }

    // Get the base URL for internal API calls
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${protocol}://${host}`

    // Call each model in parallel
    const modelPromises = models.map((model) =>
      fetch(`${baseUrl}/api/ai/gateway`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Forward the host header to maintain context
          "x-forwarded-host": host,
        },
        body: JSON.stringify({
          modelId: model.id,
          prompt: round.prompt,
          model: model.model_identifier,
        }),
      }),
    )

    const responses = await Promise.allSettled(modelPromises)

    // Process responses and create submissions
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i]
      if (response.status === "fulfilled") {
        const data = await response.value.json()
        if (data.success) {
          const { data: submission } = await supabase
            .from("submissions")
            .insert({
              round_id: roundId,
              model_id: models[i].id,
              content: data.text,
              anonymized_id: `sub_${Math.random().toString(36).substr(2, 9)}`,
            })
            .select()
            .single()

          // Log model run
          await supabase.from("model_runs").insert({
            submission_id: submission.id,
            model_id: models[i].id,
            latency_ms: data.latency,
            tokens_used: data.tokens,
            raw_response: data,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Orchestration error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
