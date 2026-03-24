export type UsageSource = "github" | "estimate"

export interface CopilotUsageSnapshot {
  source: UsageSource
  used: number
  limit: number
  fetchedAt: number
  periodKey: string
}

export interface PluginConfig {
  githubToken?: string
  githubUsername?: string
  monthlyLimit: number
  warnThresholds: number[]
  warnCooldownMinutes: number
  repeatOverLimitEvery: number
  billingCycleStartDay: number
  billingCycleTimezone: "utc" | "local"
  toastEveryPremiumRequest: boolean
  requestToastDurationMs: number
  stateFilePath?: string
  debug: boolean
}

export interface UsageState {
  schemaVersion: number
  periodKey: string
  estimateUsed: number
  latest?: CopilotUsageSnapshot
  notifiedThresholds: string[]
  lastWarnAtByThreshold: Record<string, number>
  lastOverLimitRepeatAt?: number
  lastOverLimitRepeatUsed?: number
  history: Array<{
    periodKey: string
    used: number
    limit: number
    source: UsageSource
    fetchedAt: number
  }>
}

export interface ThresholdWarning {
  id: string
  threshold: number
  ratio: number
  used: number
  limit: number
  message: string
}
