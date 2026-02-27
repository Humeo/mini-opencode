import { stepCountIs, streamText, type ModelMessage, type ToolSet } from "ai"
import { loadMessage, saveMessage } from "./memory"
import { bashTool, readTool } from "./tools"

export async function runAgent(
  userMessage: string,
  sessionID: string,
  model: string,
  systemPrompt: string,
  mcpTool: ToolSet,
) {
  const history = loadMessage(sessionID)
  const userMsg: ModelMessage = { role: "user", content: userMessage }
  history.push(userMsg)
  saveMessage(sessionID, userMsg)
  const tools = { bash: bashTool, read: readTool, ...mcpTool }

  const result = streamText({
    model: model,
    system: systemPrompt,
    messages: history,
    tools: tools,
    stopWhen: stepCountIs(10),
    onStepFinish: ({ toolCalls, toolResults }) => {
      if (toolCalls.length) {
        console.log(
          `[step] tools called: ${toolCalls.map((t) => t.toolName).join(",")}`,
        )
      }
      if (toolResults.length) {
        console.log(`[step] tool result received: ${toolResults.length}`)
      }
    },
  })

  process.stdout.write("\nAssistant: ")
  for await (const chunk of result.fullStream) {
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.text)
    } else if (chunk.type === "tool-call")
      console.log(
        `\n[tool-call] ${chunk.toolName}(${JSON.stringify(chunk.input)})`,
      )
    else if (chunk.type === "tool-result")
      console.log(`[tool-result] ${chunk.toolName} → done`)
  }

  process.stdout.write("\n\n")
  const responseMessages = (await result.response).messages
  for (const msg of responseMessages) saveMessage(sessionID, msg)
}
