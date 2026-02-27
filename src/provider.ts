import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { type ProviderConfig, loadConfig } from "./config"

function cfg(providerID: string): ProviderConfig {
  return loadConfig().providers?.[providerID] ?? {}
}

export function GetModel(providerID: string, modelID: string) {
  const c = cfg(providerID)
  const envKey = `${providerID.toUpperCase().replace(/-/g, "_")}_API_KEY`
  const apiKey = c.apiKey ?? process.env?.[envKey] ?? "none"
  if (
    c.type === "openai-compatible" ||
    (c.type !== "anthropic" && c.type !== "openai")
  ) {
    if (!c.baseURL) {
      throw new Error(`provider ${providerID} require baseURL in minioc.json`)
    }
    return createOpenAI({
      apiKey: apiKey,
      baseURL: c.baseURL,
    })(modelID)
  }

  switch (providerID) {
    case "anthropic":
      return createAnthropic({
        apiKey: apiKey,
        ...(c.baseURL ? { baseURL: c.baseURL } : {}),
      })(modelID)

    case "openai":
      return createOpenAI({
        apiKey: apiKey,
        ...(c.baseURL ? { baseURL: c.baseURL } : {}),
      })(modelID)
  }
}
