import type { PluginConfig, UsageState } from "./types"

const SCHEMA_VERSION = 1

export function getPeriodKey(now: Date, config: PluginConfig): string {
  const useUtc = config.billingCycleTimezone === "utc"
  const year = useUtc ? now.getUTCFullYear() : now.getFullYear()
  const month = useUtc ? now.getUTCMonth() : now.getMonth()
  const day = useUtc ? now.getUTCDate() : now.getDate()

  let effectiveYear = year
  let effectiveMonth = month
  if (day < config.billingCycleStartDay) {
    effectiveMonth -= 1
    if (effectiveMonth < 0) {
      effectiveMonth = 11
      effectiveYear -= 1
    }
  }

  const monthLabel = String(effectiveMonth + 1).padStart(2, "0")
  return `${effectiveYear}-${monthLabel}`
}

export function createDefaultState(periodKey: string): UsageState {
  return {
    schemaVersion: SCHEMA_VERSION,
    periodKey,
    estimateUsed: 0,
    notifiedThresholds: [],
    lastWarnAtByThreshold: {},
    history: []
  }
}

export function normalizeState(raw: unknown, periodKey: string): UsageState {
  if (!raw || typeof raw !== "object") {
    return createDefaultState(periodKey)
  }
  const candidate = raw as Partial<UsageState>
  const state: UsageState = {
    schemaVersion: SCHEMA_VERSION,
    periodKey: typeof candidate.periodKey === "string" ? candidate.periodKey : periodKey,
    estimateUsed:
      typeof candidate.estimateUsed === "number" && Number.isFinite(candidate.estimateUsed)
        ? Math.max(0, Math.floor(candidate.estimateUsed))
        : 0,
    latest: candidate.latest,
    notifiedThresholds: Array.isArray(candidate.notifiedThresholds)
      ? candidate.notifiedThresholds.filter((value): value is string => typeof value === "string")
      : [],
    lastWarnAtByThreshold:
      candidate.lastWarnAtByThreshold && typeof candidate.lastWarnAtByThreshold === "object"
        ? Object.fromEntries(
            Object.entries(candidate.lastWarnAtByThreshold).filter(
              (entry): entry is [string, number] =>
                typeof entry[0] === "string" && typeof entry[1] === "number" && Number.isFinite(entry[1])
            )
          )
        : {},
    lastOverLimitRepeatAt:
      typeof candidate.lastOverLimitRepeatAt === "number" ? candidate.lastOverLimitRepeatAt : undefined,
    lastOverLimitRepeatUsed:
      typeof candidate.lastOverLimitRepeatUsed === "number" ? candidate.lastOverLimitRepeatUsed : undefined,
    history: Array.isArray(candidate.history)
      ? candidate.history.filter(
          (item): item is UsageState["history"][number] =>
            typeof item === "object" &&
            item !== null &&
            typeof (item as { periodKey?: unknown }).periodKey === "string" &&
            typeof (item as { used?: unknown }).used === "number" &&
            typeof (item as { limit?: unknown }).limit === "number" &&
            typeof (item as { source?: unknown }).source === "string" &&
            typeof (item as { fetchedAt?: unknown }).fetchedAt === "number"
        )
      : []
  }

  if (state.periodKey !== periodKey) {
    return {
      ...createDefaultState(periodKey),
      history: trimHistory([
        ...state.history,
        ...(state.latest
          ? [
              {
                periodKey: state.periodKey,
                used: state.latest.used,
                limit: state.latest.limit,
                source: state.latest.source,
                fetchedAt: state.latest.fetchedAt
              }
            ]
          : [])
      ])
    }
  }

  return state
}

export function trimHistory(history: UsageState["history"]): UsageState["history"] {
  return history.slice(-12)
}
