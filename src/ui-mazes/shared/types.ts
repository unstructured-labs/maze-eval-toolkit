/**
 * Shared types for AI control panel and LLM interactions
 */

export interface LLMConfig {
  apiKey: string
  model: string
  baseURL?: string
}

export interface LLMResponseStats {
  durationMs: number
  outputTokens: number
  cost: number
}

export type LogLevel = 'info' | 'success' | 'error' | 'request' | 'response'

export type LogCallback = (level: LogLevel, message: string, details?: string) => void

export interface AgentLog {
  id: string
  level: LogLevel
  message: string
  timestamp: number
  details?: string
  stats?: LLMResponseStats
}

export interface SessionMetrics {
  cost: number
  totalThinkingMs: number
  decisionCount: number
}

export type HistoryItemStatus = 'pending' | 'executing' | 'success' | 'failed'

export interface HistoryItem {
  id: string
  label: string
  status: HistoryItemStatus
}
