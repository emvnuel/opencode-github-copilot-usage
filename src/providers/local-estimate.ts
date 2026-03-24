import type { CopilotUsageSnapshot, UsageState } from "../types"

export function incrementEstimate(state: UsageState, amount = 1): UsageState {
  return {
    ...state,
    estimateUsed: Math.max(0, state.estimateUsed + amount)
  }
}

export function snapshotFromEstimate(
  state: UsageState,
  periodKey: string,
  limit: number
): CopilotUsageSnapshot {
  return {
    source: "estimate",
    used: state.estimateUsed,
    limit,
    fetchedAt: Date.now(),
    periodKey
  }
}
