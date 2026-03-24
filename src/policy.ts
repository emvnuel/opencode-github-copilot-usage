import type { CopilotUsageSnapshot, PluginConfig, ThresholdWarning, UsageState } from "./types"

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function evaluateWarnings(
  snapshot: CopilotUsageSnapshot,
  state: UsageState,
  config: PluginConfig,
  now = Date.now()
): ThresholdWarning[] {
  const warnings: ThresholdWarning[] = []
  if (snapshot.limit <= 0) return warnings

  const ratio = snapshot.used / snapshot.limit
  const cooldownMs = config.warnCooldownMinutes * 60 * 1000

  for (const threshold of config.warnThresholds) {
    if (ratio < threshold) continue

    const id = `${snapshot.periodKey}:${threshold}`
    const alreadyNotified = state.notifiedThresholds.includes(id)
    const lastAt = state.lastWarnAtByThreshold[id]
    const inCooldown = typeof lastAt === "number" && now - lastAt < cooldownMs

    if (alreadyNotified || inCooldown) continue

    warnings.push({
      id,
      threshold,
      ratio,
      used: snapshot.used,
      limit: snapshot.limit,
      message: `Copilot premium usage reached ${percent(threshold)} (${snapshot.used}/${snapshot.limit}).`
    })
  }

  if (ratio > 1) {
    const deltaUsed = snapshot.used - (state.lastOverLimitRepeatUsed ?? snapshot.limit)
    const lastAt = state.lastOverLimitRepeatAt ?? 0
    const dueByCount = deltaUsed >= config.repeatOverLimitEvery
    const dueByTime = now - lastAt >= cooldownMs

    if (dueByCount || dueByTime) {
      warnings.push({
        id: `${snapshot.periodKey}:over-limit-repeat`,
        threshold: 1,
        ratio,
        used: snapshot.used,
        limit: snapshot.limit,
        message: `Copilot premium usage is over limit (${snapshot.used}/${snapshot.limit}).`
      })
    }
  }

  return warnings
}

export function applyWarnings(state: UsageState, warnings: ThresholdWarning[], now = Date.now()): UsageState {
  if (!warnings.length) return state

  const notifiedThresholds = new Set(state.notifiedThresholds)
  const lastWarnAtByThreshold = { ...state.lastWarnAtByThreshold }
  let lastOverLimitRepeatAt = state.lastOverLimitRepeatAt
  let lastOverLimitRepeatUsed = state.lastOverLimitRepeatUsed

  for (const warning of warnings) {
    if (warning.id.endsWith(":over-limit-repeat")) {
      lastOverLimitRepeatAt = now
      lastOverLimitRepeatUsed = warning.used
      continue
    }
    notifiedThresholds.add(warning.id)
    lastWarnAtByThreshold[warning.id] = now
  }

  return {
    ...state,
    notifiedThresholds: Array.from(notifiedThresholds),
    lastWarnAtByThreshold,
    lastOverLimitRepeatAt,
    lastOverLimitRepeatUsed
  }
}
