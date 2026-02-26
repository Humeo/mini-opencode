import { type ProviderConfig, loadConfig } from "./config"

function cfg(providerID: string): ProviderConfig {
  return loadConfig().providers?.[providerID] ?? {}
}

export function GetModel(providerID: string, modelID: string) {
  const c = cfg(providerID)
}
