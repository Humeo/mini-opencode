import { readFileSync } from "fs"
import { join } from "path"

export interface ProviderConfig {
  type?: "openai-compatible" | "openai" | "anthropic"
  apiKey?: string
  baseURL?: string
}

export interface Config {
  model: string
  skills?: string
  defaultProvider?: string
  mcp?: Record<string, { cmd: string; args?: string[] }>
  providers?: Record<string, ProviderConfig>
}

export interface ParsedConfig {
  modelID: string
  providerID: string
}

export function loadConfig(cwd = process.cwd()): Config {
  const path = join(cwd, "minioc.json")
  const raw = readFileSync(path, "utf-8")
  return JSON.parse(raw) as Config
}

export function ParseModel(model: string, provider?: string) {
  const slash = model.indexOf("/")
  if (slash === -1) {
    if (!provider) {
      throw new Error("Provider is required")
    }
    return {
      modelID: model,
      providerID: provider,
    }
  }
  return {
    modelID: model.slice(0, slash),
    providerID: model.slice(slash + 1),
  }
}
