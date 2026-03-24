import type { CopilotUsageSnapshot, PluginConfig } from "../types"

interface BillingUsageResponse {
  usageItems?: Array<{
    sku?: string
    grossQuantity?: number
  }>
}

interface CopilotInternalResponse {
  quota_reset_date_utc?: string
  quota_snapshots?: {
    premium_interactions?: {
      entitlement?: number
      quota_remaining?: number
      remaining?: number
      unlimited?: boolean
    }
  }
}

async function fetchJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  })
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} for ${url}`)
  }
  return (await response.json()) as T
}

async function fetchCopilotInternal(token: string): Promise<CopilotInternalResponse> {
  return fetchJson<CopilotInternalResponse>("https://api.github.com/copilot_internal/user", token)
}

async function resolveUsername(token: string): Promise<string> {
  const data = await fetchJson<{ login?: string }>("https://api.github.com/user", token)
  if (!data.login) {
    throw new Error("Unable to resolve GitHub username from /user endpoint")
  }
  return data.login
}

export async function fetchGitHubUsage(
  config: PluginConfig,
  periodKey: string
): Promise<CopilotUsageSnapshot | null> {
  if (!config.githubToken) {
    return null
  }

  try {
    const internal = await fetchCopilotInternal(config.githubToken)
    const premium = internal.quota_snapshots?.premium_interactions
    if (premium && !premium.unlimited) {
      const entitlement = premium.entitlement ?? config.monthlyLimit
      const remaining = premium.quota_remaining ?? premium.remaining ?? 0
      const used = Math.max(0, entitlement - remaining)
      return {
        source: "github",
        used: Math.max(0, Math.floor(used)),
        limit: Math.max(1, Math.floor(entitlement)),
        fetchedAt: Date.now(),
        periodKey
      }
    }
  } catch {
    // fallback below to billing summary endpoint
  }

  const username = config.githubUsername ?? (await resolveUsername(config.githubToken))
  const billing = await fetchJson<BillingUsageResponse>(
    `https://api.github.com/users/${username}/settings/billing/usage/summary`,
    config.githubToken
  )

  const entry = billing.usageItems?.find((item) => item.sku === "copilot_premium_request")
  const used = entry?.grossQuantity ?? 0

  return {
    source: "github",
    used: Math.max(0, Math.floor(used)),
    limit: config.monthlyLimit,
    fetchedAt: Date.now(),
    periodKey
  }
}
