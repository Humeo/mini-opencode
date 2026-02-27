import { loadConfig, ParseModel } from "./config"
import { GetModel } from "./provider"
import { loadSkills } from "./skills"
import { join } from "path"
import {buildSystemPrompt} from "./system"
import {type ToolSet} from "ai"

const SESSION_ID = `session_${Date.now()}`

async function main() {
  const config = loadConfig(import.meta.dir + "/..")
  const { providerID, modelID } = ParseModel(config.model, config.defaultProvider)
  const model = GetModel(providerID, modelID)

  console.log(`[init] model: ${config.model}`)
  console.log(`[init] session: ${SESSION_ID}`)
  
    // Load skills
    const skillsDir = config.skills ? join(import.meta.dir + "/..", config.skills) : null
    const skills = skillsDir ? await loadSkills(skillsDir) : []
  
    // Build system prompt
    const systemPrompt = buildSystemPrompt(skills)
  
    // Connect MCP servers
    const mcpTools: ToolSet = {}
    if (config.mcp) {
      for (const [name, mcpConfig] of Object.entries(config.mcp)) {
        const tools = await connectMcp(name, mcpConfig).catch((e) => {
          console.warn(`[mcp:${name}] failed to connect: ${e.message}`)
          return {} as ToolSet
        })
        Object.assign(mcpTools, tools)
      }
    }
