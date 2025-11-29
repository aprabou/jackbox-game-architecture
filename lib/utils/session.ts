// Session management for anonymous players
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""

  let sessionId = localStorage.getItem("gameSessionId")
  if (!sessionId) {
    sessionId = `session_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem("gameSessionId", sessionId)
  }
  return sessionId
}

export function generateRoomCode(): string {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

export function generateAnonymizedId(): string {
  const adjectives = ["happy", "quick", "bright", "silly", "clever", "bold", "wild", "keen"]
  const nouns = ["fox", "panda", "eagle", "shark", "tiger", "lion", "wolf", "owl"]
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 999)
  return `${adj}_${noun}_${num}`
}
