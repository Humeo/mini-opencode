import {
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type ToolSet,
} from "ai"
import { loadMessage, saveMessage } from "./memory"
import { bashTool, readTool, createSkillTool } from "./tools"
import type { Skill } from "./skills"

const DEBUG_STREAM = process.env.MINIOC_DEBUG_STREAM === "1"

function extractTextFromMessageContent(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""

  return content
    .map((part) => {
      if (!part || typeof part !== "object") return ""
      const record = part as Record<string, unknown>
      return typeof record.text === "string" ? record.text : ""
    })
    .join("")
}

export async function runAgent(
  userMessage: string,
  sessionID: string,
  model: LanguageModel,
  systemPrompt: string,
  skills: Skill[],
  mcpTools: ToolSet,
) {
  const history = loadMessage(sessionID)
  const userMsg: ModelMessage = { role: "user", content: userMessage }
  history.push(userMsg)
  saveMessage(sessionID, userMsg)
  const tools = {
    bash: bashTool,
    read: readTool,
    skill: createSkillTool(skills),
    ...mcpTools,
  }

  try {
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
    let hasTextOutput = false
    for await (const chunk of result.fullStream) {
      if (DEBUG_STREAM) {
        console.log(`\n[debug] chunk.type=${chunk.type}`)
      }
      if (chunk.type === "text-delta") {
        hasTextOutput = true
        if (DEBUG_STREAM) {
          console.log(`[debug] text-delta.length=${chunk.text.length}`)
        }
        process.stdout.write(chunk.text)
      } else if (chunk.type === "tool-call")
        console.log(
          `\n[tool-call] ${chunk.toolName}(${JSON.stringify(chunk.input)})`,
        )
      else if (chunk.type === "tool-result")
        console.log(`[tool-result] ${chunk.toolName} → done`)
    }

    const responseMessages = (await result.response).messages
    if (!hasTextOutput) {
      const fallbackText = responseMessages
        .filter((msg) => msg.role === "assistant")
        .map((msg) => extractTextFromMessageContent(msg.content))
        .join("")
        .trim()

      if (fallbackText) {
        if (DEBUG_STREAM) {
          console.log(`[debug] fallback.hit=true length=${fallbackText.length}`)
        }
        process.stdout.write(`${fallbackText}\n`)
      } else {
        if (DEBUG_STREAM) {
          console.log("[debug] fallback.hit=false")
        }
        process.stdout.write(
          "[no-text-output] 本次请求未返回文本，可能是上游模型或网络异常，请重试。\n",
        )
      }
    }
    process.stdout.write("\n")
    for (const msg of responseMessages) saveMessage(sessionID, msg)
  } catch (e) {
    process.stdout.write("\n")
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[agent-error] model request failed: ${message}`)
  }
}
