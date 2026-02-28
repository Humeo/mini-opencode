import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { type ProviderConfig, loadConfig } from "./config"
import type { LanguageModel } from "ai"

function cfg(providerID: string): ProviderConfig {
  return loadConfig().providers?.[providerID] ?? {}
}

export function GetModel(providerID: string, modelID: string): LanguageModel {
  const c = cfg(providerID)
  const envKey = `${providerID.toUpperCase().replace(/-/g, "_")}_API_KEY`
  const apiKey = c.apiKey ?? process.env?.[envKey] ?? "none"
  if (
    c.type === "openai-compatible" ||
    (providerID !== "anthropic" && providerID !== "openai")
  ) {
    if (!c.baseURL) {
      throw new Error(`provider ${providerID} require baseURL in minioc.json`)
    }
    // Use .chat() to force Chat Completions API (/v1/chat/completions).
    // The default createOpenAI()(modelId) routes to Responses API (/v1/responses)
    // in @ai-sdk/openai v3+, which requires server-side message storage and is
    // incompatible with our client-side history approach.
    return createOpenAI({
      apiKey: apiKey,
      baseURL: c.baseURL,
    }).chat(modelID)
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
      }).chat(modelID)
  }
}
