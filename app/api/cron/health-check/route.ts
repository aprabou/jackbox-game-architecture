import { NextResponse } from "next/server"

// This endpoint can be called by Vercel Cron to keep the deployment active
export async function GET() {
  try {
    // Verify OIDC token is available
    const oidcToken = process.env.VERCEL_OIDC_TOKEN

    if (!oidcToken) {
      return NextResponse.json(
        { error: "OIDC token not available" },
        { status: 500 }
      )
    }

    // You could also do a test API call here to verify it works
    const testResponse = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tokenAvailable: true,
      gatewayStatus: testResponse.ok ? "healthy" : "unhealthy",
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
