import { tool } from "@opencode-ai/plugin"
import type { CopilotUsageSnapshot, UsageState } from "./types"

function formatSnapshot(snapshot: CopilotUsageSnapshot, stateFilePath: string): string {
  const ratio = snapshot.limit > 0 ? snapshot.used / snapshot.limit : 0
  const pct = Math.round(ratio * 100)
  const remaining = Math.max(0, snapshot.limit - snapshot.used)
  return [
    `Source: ${snapshot.source}`,
    `Billing period: ${snapshot.periodKey}`,
    `Used: ${snapshot.used}/${snapshot.limit} (${pct}%)`,
    `Remaining: ${remaining}`,
    `Fetched at: ${new Date(snapshot.fetchedAt).toISOString()}`,
    `State file: ${stateFilePath}`
  ].join("\n")
}

export function createStatusTool(getState: () => UsageState, getStatePath: () => string) {
  return tool({
    description: "Show Copilot premium usage status from the plugin state",
    args: {},
    async execute() {
      const state = getState()
      if (!state.latest) {
        return `No usage snapshot available yet. State file: ${getStatePath()}`
      }
      return formatSnapshot(state.latest, getStatePath())
    }
  })
}
