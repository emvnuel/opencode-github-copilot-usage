import type { PluginConfig } from "./types"
import { readCopilotTokenFromOpencodeAuth } from "./opencode-auth"

const DEFAULTS: PluginConfig = {
  monthlyLimit: 300,
  warnThresholds: [0.75, 0.9, 1],
  warnCooldownMinutes: 360,
  repeatOverLimitEvery: 25,
  billingCycleStartDay: 1,
  billingCycleTimezone: "utc",
  toastEveryPremiumRequest: true,
  requestToastDurationMs: 3000,
  debug: false
}

export function readNumber(name: string): number | undefined {
  const value = process.env[name]
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function readBool(name: string): boolean | undefined {
  const value = process.env[name]
  if (!value) return undefined
  if (value === "1" || value.toLowerCase() === "true") return true
  if (value === "0" || value.toLowerCase() === "false") return false
  return undefined
}

export function loadConfig(): PluginConfig {
  const monthlyLimit = readNumber("OPENCODE_COPILOT_USAGE_MONTHLY_LIMIT")
  const billingCycleStartDay = readNumber("OPENCODE_COPILOT_USAGE_BILLING_START_DAY")
  const warnCooldownMinutes = readNumber("OPENCODE_COPILOT_USAGE_WARN_COOLDOWN_MINUTES")
  const repeatOverLimitEvery = readNumber("OPENCODE_COPILOT_USAGE_REPEAT_OVER_LIMIT_EVERY")
  const warnThresholdsRaw = process.env.OPENCODE_COPILOT_USAGE_WARN_THRESHOLDS
  const warnThresholds = warnThresholdsRaw
    ? warnThresholdsRaw
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((value) => Number.isFinite(value) && value > 0)
    : DEFAULTS.warnThresholds

  const timezoneEnv = process.env.OPENCODE_COPILOT_USAGE_BILLING_TIMEZONE
  const billingCycleTimezone = timezoneEnv === "local" ? "local" : "utc"

  const tokenFromEnv =
    process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? process.env.COPILOT_API_GITHUB_TOKEN
  const token = tokenFromEnv ?? readCopilotTokenFromOpencodeAuth()
  const requestToastDurationMs = readNumber("OPENCODE_COPILOT_USAGE_REQUEST_TOAST_DURATION_MS")

  return {
    githubToken: token,
    githubUsername: process.env.GITHUB_USERNAME,
    monthlyLimit: monthlyLimit && monthlyLimit > 0 ? monthlyLimit : DEFAULTS.monthlyLimit,
    warnThresholds: warnThresholds.length ? warnThresholds : DEFAULTS.warnThresholds,
    warnCooldownMinutes:
      warnCooldownMinutes && warnCooldownMinutes >= 0 ? warnCooldownMinutes : DEFAULTS.warnCooldownMinutes,
    repeatOverLimitEvery:
      repeatOverLimitEvery && repeatOverLimitEvery > 0 ? repeatOverLimitEvery : DEFAULTS.repeatOverLimitEvery,
    billingCycleStartDay:
      billingCycleStartDay && billingCycleStartDay >= 1 && billingCycleStartDay <= 28
        ? billingCycleStartDay
        : DEFAULTS.billingCycleStartDay,
    billingCycleTimezone,
    toastEveryPremiumRequest:
      readBool("OPENCODE_COPILOT_USAGE_TOAST_EVERY_PREMIUM_REQUEST") ?? DEFAULTS.toastEveryPremiumRequest,
    requestToastDurationMs:
      requestToastDurationMs && requestToastDurationMs > 0
        ? Math.floor(requestToastDurationMs)
        : DEFAULTS.requestToastDurationMs,
    stateFilePath: process.env.OPENCODE_COPILOT_USAGE_STATE_FILE,
    debug: readBool("OPENCODE_COPILOT_USAGE_DEBUG") ?? DEFAULTS.debug
  }
}
