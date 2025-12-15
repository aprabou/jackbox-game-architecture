// Text cleanup utilities for AI-generated rap verses

export const PREAMBLE_PATTERNS = [
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

export const MARKDOWN_PATTERNS = {
  boldItalic: /\*\*\*(.+?)\*\*\*/g,
  bold: /\*\*(.+?)\*\*/g,
  italic: /\*(.+?)\*/g,
  boldUnderscore: /__(.+?)__/g,
  italicUnderscore: /_(.+?)_/g,
  strikethrough: /~~(.+?)~~/g,
  codeBlock: /`{3}[\s\S]*?`{3}/g,
  inlineCode: /`(.+?)`/g,
  link: /\[(.+?)\]\(.+?\)/g,
  header: /^#+\s+/gm,
}

export const REFUSAL_PATTERNS = [
  /I don't feel comfortable/i,
  /I can't participate/i,
  /I aim to engage respectfully/i,
  /I'd prefer not to/i,
  /I cannot engage/i,
  /not comfortable/i,
  /respectful/i,
]

/**
 * Removes preambles and intro phrases from text
 */
export function removePreambles(text: string): string {
  let cleaned = text
  PREAMBLE_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, "")
  })

  // Clean up empty lines and trim
  return cleaned
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim()
}

/**
 * Removes all markdown formatting from text
 */
export function removeMarkdown(text: string): string {
  return text
    .replace(MARKDOWN_PATTERNS.boldItalic, "$1")
    .replace(MARKDOWN_PATTERNS.bold, "$1")
    .replace(MARKDOWN_PATTERNS.italic, "$1")
    .replace(MARKDOWN_PATTERNS.boldUnderscore, "$1")
    .replace(MARKDOWN_PATTERNS.italicUnderscore, "$1")
    .replace(MARKDOWN_PATTERNS.strikethrough, "$1")
    .replace(MARKDOWN_PATTERNS.codeBlock, "")
    .replace(MARKDOWN_PATTERNS.inlineCode, "$1")
    .replace(MARKDOWN_PATTERNS.link, "$1")
    .replace(MARKDOWN_PATTERNS.header, "")
}

/**
 * Ensures every line ends with a comma for rap flow
 */
export function enforceCommas(text: string): string {
  return text
    .split("\n")
    .map((line) => {
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
}

/**
 * Detects if text contains a refusal to participate
 */
export function detectRefusal(text: string): boolean {
  return REFUSAL_PATTERNS.some((pattern) => pattern.test(text))
}

/**
 * Complete text cleanup pipeline for rap verses
 */
export function cleanRapText(text: string): string {
  let cleaned = text
  cleaned = removePreambles(cleaned)
  cleaned = removeMarkdown(cleaned)
  cleaned = enforceCommas(cleaned)
  return cleaned
}
