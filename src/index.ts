import { loadConfig, ParseModel } from "./config"
import { GetModel } from "./provider"
import { loadSkills } from "./skills"
import { join } from "path"
import { buildSystemPrompt } from "./system"
import { type ToolSet } from "ai"
import connectMcp from "./mcp"
import { runAgent } from "./agents"
import * as readline from "node:readline/promises"

const SESSION_ID = `session_${Date.now()}`

async function main() {
  const config = loadConfig(import.meta.dir + "/..")
  const { providerID, modelID } = ParseModel(
    config.model,
    config.defaultProvider,
  )
  const model = GetModel(providerID, modelID)

  console.log(`[init] model: ${config.model}`)
  console.log(`[init] session: ${SESSION_ID}`)

  // Load skills
  const skillsDir = config.skills
    ? join(import.meta.dir + "/..", config.skills)
    : null
  const skills = skillsDir ? await loadSkills(skillsDir) : []

  // Build system prompt
  const systemPrompt = buildSystemPrompt(skills)

  // Connect MCP servers
  const mcpTools: ToolSet = {}
  if (config.mcp) {
    for (const [name, mcpConfig] of Object.entries(config.mcp)) {
      const tools = await connectMcp(name, {
        command: mcpConfig.cmd,
        args: mcpConfig.args,
      }).catch((e) => {
        console.warn(`[mcp:${name}] failed to connect: ${e.message}`)
        return {} as ToolSet
      })
      Object.assign(mcpTools, tools)
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  let isClosed = false

  console.log('\nmini-opencode ready. Type your message (or "exit" to quit).\n')

  while (true) {
    let input = "exit"
    try {
      input = await rl.question("You: ")
    } catch {
      break
    }
    if (!input || input.trim().toLowerCase() === "exit") {
      console.log("Goodbye!")
      if (!isClosed) {
        rl.close()
        isClosed = true
      }
      break
    }
    try {
      await runAgent(
        input.trim(),
        SESSION_ID,
        model,
        systemPrompt,
        skills,
        mcpTools,
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error(`[agent-error] ${message}`)
    }
  }

  if (!isClosed) {
    rl.close()
  }
}

main().catch((e) => {
  console.error("[fatal]", e)
  process.exit(1)
})
