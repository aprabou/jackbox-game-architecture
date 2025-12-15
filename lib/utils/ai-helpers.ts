// AI-specific utility functions

/**
 * Generates a fallback verse when AI models refuse or fail to generate content
 */
export function generateFallbackVerse(
  modelName: string,
  opponentName: string,
  opponentProvider: string
): string {
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
