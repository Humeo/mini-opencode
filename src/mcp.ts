import { tool, type ToolSet } from "ai"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { z } from "zod"

function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodTypeAny {
  if (schema.type === "object") {
    const props =
      (schema.properties as Record<string, Record<string, unknown>>) ?? {}
    const requires = (schema.required as string[]) ?? []
    const shape: Record<string, z.ZodTypeAny> = {}
    for (const [key, val] of Object.entries(props)) {
      let filed = jsonSchemaToZod(val)
      if (!requires.includes(key)) {
        filed = filed.optional()
      }
      shape[key] = filed
    }
    return z.object(shape)
  }

  if (schema.type === "string") return z.string()
  if (schema.type === "number" || schema.type === "integer") return z.number()
  if (schema.type === "boolean") return z.boolean()
  if (schema.type === "array")
    return z.array(
      jsonSchemaToZod((schema.items as Record<string, unknown>) ?? {}),
    )
  return z.unknown()
}

export default async function connectMcp(
  name: string,
  config: { command: string; args?: string[] },
): Promise<ToolSet> {
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args ?? [],
  })
  const client = new Client({ name: "mini-opencode", version: "0.0.1" })
  await client.connect(transport)
  const { tools: mcpTools } = await client.listTools()
  console.log(`[mcp:${name}] connected, ${mcpTools.length} tools`)

  let toolSet: ToolSet = {}

  for (const t of mcpTools) {
    const toolName = `${name}_${t.name}`
    toolSet[toolName] = tool({
      description: t.description ?? "",
      inputSchema: jsonSchemaToZod(
        t.inputSchema as Record<string, unknown>,
      ) as z.ZodObject<z.ZodRawShape>,
      execute: async (input) => {
        const result = await client.callTool({
          name: t.name,
          arguments: input as Record<string, unknown>,
        })
        return result.content
      },
    })
  }

  return toolSet
}
