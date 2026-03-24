import type { Plugin } from "@opencode-ai/plugin"
import { loadConfig } from "./config"
import { applyWarnings, evaluateWarnings } from "./policy"
import { fetchGitHubUsage } from "./providers/github"
import { incrementEstimate, snapshotFromEstimate } from "./providers/local-estimate"
import { createDefaultState, getPeriodKey, normalizeState, trimHistory } from "./state"
import { loadState, resolveStatePath, saveState } from "./storage"
import { createStatusTool } from "./tool"
import type { CopilotUsageSnapshot, UsageState } from "./types"

const SERVICE = "opencode-copilot-usage"

function isCopilotMessage(event: unknown): boolean {
  const info = (event as { properties?: { info?: { role?: string; providerID?: string; model?: { providerID?: string; modelID?: string } } } })
    .properties?.info
  const role = info?.role
  if (role !== "assistant") return false

  const provider = String(info?.providerID ?? info?.model?.providerID ?? "").toLowerCase()
  const model = String(info?.model?.modelID ?? "").toLowerCase()
  return provider.includes("github") || provider.includes("copilot") || model.includes("copilot")
}

function shouldRefreshOnEvent(type: string): boolean {
  return (
    type === "session.updated" ||
    type === "session.idle" ||
    type === "command.executed" ||
    type === "session.status"
  )
}

export const CopilotUsagePlugin: Plugin = async ({ client, directory }) => {
  const config = loadConfig()
  const periodKey = getPeriodKey(new Date(), config)
  const statePath = resolveStatePath(directory, config.stateFilePath)
  const raw = await loadState(statePath)
  let state: UsageState = normalizeState(raw, periodKey)
  const countedMessages = new Set<string>()
  let refreshInFlight: Promise<void> | null = null

  if (!state.latest) {
    state = {
      ...state,
      latest: snapshotFromEstimate(state, periodKey, config.monthlyLimit)
    }
    await saveState(statePath, state)
  }

  async function log(level: "debug" | "info" | "warn" | "error", message: string, extra?: Record<string, unknown>) {
    if (level === "debug" && !config.debug) return
    try {
      await client.app.log({
        body: {
          service: SERVICE,
          level,
          message,
          extra
        }
      })
    } catch {
      // best effort logging only
    }
  }

  async function showWarningToast(message: string) {
    try {
      await client.tui.showToast({
        body: {
          title: "Copilot Usage",
          message,
          variant: "warning",
          duration: 7000
        }
      })
    } catch {
      await log("warn", "Unable to show TUI toast", { message })
    }
  }

  async function showRequestToast(used: number, limit: number, source: CopilotUsageSnapshot["source"]) {
    if (!config.toastEveryPremiumRequest) return
    try {
      await client.tui.showToast({
        body: {
          title: "Copilot Premium Request",
          message: `Premium request sent. Usage: ${used}/${limit} (${source}).`,
          variant: "info",
          duration: config.requestToastDurationMs
        }
      })
    } catch {
      await log("warn", "Unable to show request toast", { used, limit, source })
    }
  }

  async function persist(nextState: UsageState) {
    state = nextState
    await saveState(statePath, state)
  }

  async function refreshUsage(reason: string) {
    if (refreshInFlight) {
      return refreshInFlight
    }

    refreshInFlight = (async () => {
      const currentPeriod = getPeriodKey(new Date(), config)
      if (state.periodKey !== currentPeriod) {
        state = normalizeState(state, currentPeriod)
      }

      let snapshot: CopilotUsageSnapshot
      try {
        const github = await fetchGitHubUsage(config, currentPeriod)
        snapshot = github ?? snapshotFromEstimate(state, currentPeriod, config.monthlyLimit)
      } catch (error) {
        snapshot = snapshotFromEstimate(state, currentPeriod, config.monthlyLimit)
        await log("warn", "GitHub usage fetch failed, using local estimate", {
          reason,
          error: error instanceof Error ? error.message : String(error)
        })
      }

      const nextWarnings = evaluateWarnings(snapshot, state, config)
      let nextState: UsageState = {
        ...state,
        latest: snapshot,
        history: trimHistory([
          ...state.history.filter((entry) => entry.periodKey !== snapshot.periodKey),
          {
            periodKey: snapshot.periodKey,
            used: snapshot.used,
            limit: snapshot.limit,
            source: snapshot.source,
            fetchedAt: snapshot.fetchedAt
          }
        ])
      }

      if (nextWarnings.length) {
        for (const warning of nextWarnings) {
          await showWarningToast(warning.message)
        }
        nextState = applyWarnings(nextState, nextWarnings)
      }

      await persist(nextState)
      await log("debug", "Usage refresh completed", {
        reason,
        source: snapshot.source,
        used: snapshot.used,
        limit: snapshot.limit
      })
    })()

    try {
      await refreshInFlight
    } finally {
      refreshInFlight = null
    }
  }

  await refreshUsage("startup")

  return {
    event: async ({ event }) => {
      if (event.type === "message.updated" && isCopilotMessage(event)) {
        const messageID = event.properties.info.id
        if (!countedMessages.has(messageID)) {
          countedMessages.add(messageID)
          if (countedMessages.size > 500) {
            const first = countedMessages.values().next().value
            if (typeof first === "string") countedMessages.delete(first)
          }
          state = incrementEstimate(state)
          await persist(state)
          const source = state.latest?.source ?? "estimate"
          const limit = state.latest?.limit ?? config.monthlyLimit
          const used = Math.max(state.estimateUsed, state.latest?.used ?? state.estimateUsed)
          await showRequestToast(used, limit, source)
        }
      }

      if (shouldRefreshOnEvent(event.type)) {
        await refreshUsage(`event:${event.type}`)
      }
    },
    "tool.execute.after": async (input) => {
      if (input.tool === "question") {
        await refreshUsage("tool:question")
      }
    },
    tool: {
      copilot_usage_status: createStatusTool(() => state, () => statePath)
    }
  }
}

export default CopilotUsagePlugin
