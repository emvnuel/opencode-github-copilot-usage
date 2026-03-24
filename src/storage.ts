import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"
import type { UsageState } from "./types"

export function resolveStatePath(directory: string, customPath?: string): string {
  if (customPath) {
    return path.isAbsolute(customPath) ? customPath : path.resolve(directory, customPath)
  }
  return path.join(directory, ".opencode", "state", "copilot-usage.json")
}

export async function loadState(filePath: string): Promise<unknown> {
  try {
    const raw = await readFile(filePath, "utf8")
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export async function saveState(filePath: string, state: UsageState): Promise<void> {
  const folder = path.dirname(filePath)
  await mkdir(folder, { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await writeFile(tmpPath, `${JSON.stringify(state, null, 2)}\n`, "utf8")
  await rename(tmpPath, filePath)
}
