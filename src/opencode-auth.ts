import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

interface AuthEntry {
  type?: string
  access?: string
  refresh?: string
  key?: string
}

type AuthFile = Record<string, AuthEntry>

export function resolveOpencodeAuthPath(): string {
  return process.env.OPENCODE_AUTH_FILE ?? path.join(homedir(), ".local", "share", "opencode", "auth.json")
}

export function readCopilotTokenFromOpencodeAuth(): string | undefined {
  try {
    const filePath = resolveOpencodeAuthPath()
    const raw = readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw) as AuthFile
    const entry = parsed["github-copilot"]
    if (!entry || typeof entry !== "object") return undefined

    const candidates = [entry.access, entry.key, entry.refresh]
    for (const token of candidates) {
      if (typeof token === "string" && token.trim().length > 0) {
        return token.trim()
      }
    }
    return undefined
  } catch {
    return undefined
  }
}
