// Domain type definitions for the AI rap battle game

export interface Model {
  id: string
  name: string
  provider: string
  model_identifier: string
  is_enabled: boolean
  config?: Record<string, any>
}

export interface RapVerse {
  lines: string[]
  currentLineIndex: number
  isComplete: boolean
}

export interface Round {
  id: string
  battle_id: string
  round_number: number
  created_at: string
}

export interface Submission {
  id: string
  round_id: string
  model_id: string
  content: string
  anonymized_id: string
  created_at: string
}

export interface Player {
  id: string
  session_id: string
  display_name: string
}

export interface Battle {
  id: string
  model1_id: string
  model2_id: string
  status: string
  created_at: string
}

export interface AIResponse {
  success: boolean
  text: string
  tokens?: number
  latency?: number
  wasFallback?: boolean
  error?: string
}

export interface StandardAPIResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    code?: string
    details?: any
  }
  meta?: {
    duration?: number
    tokens?: number
    model?: string
    provider?: string
  }
}
